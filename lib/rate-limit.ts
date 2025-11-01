import { NextRequest, NextResponse } from 'next/server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

// In-memory store for rate limiting (for single instance)
// For production with multiple instances, use Redis or Supabase-backed table
const rateLimitStore: RateLimitStore = {};

export interface RateLimitOptions {
  limit: number; // Number of requests allowed
  windowMs: number; // Time window in milliseconds
  keyGenerator?: (request: NextRequest) => string;
}

export function getRateLimitKey(request: NextRequest, prefix: string): string {
  // Use IP address or user ID as the key
  // Try multiple headers for IP extraction (for different proxy setups)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.ip ||
    'unknown';
  return `${prefix}:${ip}`;
}

export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const key = options.keyGenerator
    ? options.keyGenerator(request)
    : getRateLimitKey(request, 'api');

  const now = Date.now();

  // Prefer Redis store if configured (multi-instance, low-latency)
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      let RedisClient: any = (global as any).__redisClient;
      if (!RedisClient) {
        try {
          // dynamically require ioredis to avoid breaking if not installed
          const IORedis = require('ioredis');
          RedisClient = new IORedis(redisUrl);
          (global as any).__redisClient = RedisClient;
        } catch (e) {
          console.warn('[RateLimit] ioredis not installed, falling back to Supabase/in-memory store');
          RedisClient = null;
        }
      }

      if (RedisClient) {
        const redisKey = `rate:${key}`;
        // Use Redis INCR with TTL
        const ttlSeconds = Math.ceil(options.windowMs / 1000);
        const count = await RedisClient.incr(redisKey);
        if (count === 1) {
          await RedisClient.expire(redisKey, ttlSeconds);
        }

        const allowed = count <= options.limit;
        const remaining = Math.max(0, options.limit - count);
        const ttl = await RedisClient.ttl(redisKey);
        const resetTime = Date.now() + (ttl > 0 ? ttl * 1000 : options.windowMs);

        return { allowed, remaining, resetTime };
      }
    } catch (err) {
      console.error('[RateLimit] Redis error, falling back:', err);
    }
  }

  // If SUPABASE rate-limit store enabled, persist counters there for multi-instance safety
  const useSupabaseStore = process.env.USE_SUPABASE_RATE_LIMIT === 'true' || !!process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

  if (useSupabaseStore) {
    try {
      // table: rate_limit_counters with columns: key (text primary), count (int), reset_time (bigint)
      const { data, error } = await supabaseAdmin
        .from('rate_limit_counters')
        .select('*')
        .eq('key', key)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[RateLimit] Supabase read error:', error);
      }

      const record = data as any;

      if (!record || now > Number(record.reset_time)) {
        const resetTime = now + options.windowMs;
        const { error: insertErr } = await supabaseAdmin
          .from('rate_limit_counters')
          .upsert({ key, count: 1, reset_time: resetTime }, { onConflict: 'key' });
        if (insertErr) console.error('[RateLimit] Supabase upsert error:', insertErr);

        return { allowed: true, remaining: options.limit - 1, resetTime };
      }

      // increment
      const newCount = Number(record.count) + 1;
      const { error: updateErr } = await supabaseAdmin
        .from('rate_limit_counters')
        .update({ count: newCount })
        .eq('key', key);
      if (updateErr) console.error('[RateLimit] Supabase update error:', updateErr);

      const allowed = newCount <= options.limit;
      const remaining = Math.max(0, options.limit - newCount);

      return { allowed, remaining, resetTime: Number(record.reset_time) };
    } catch (err) {
      console.error('[RateLimit] Supabase fallback error:', err);
      // fallback to in-memory
    }
  }

  // In-memory fallback (single node)
  const record = rateLimitStore[key];

  // Initialize or reset if window expired
  if (!record || now > record.resetTime) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetTime: rateLimitStore[key].resetTime,
    };
  }

  // Increment count
  record.count++;

  const allowed = record.count <= options.limit;
  const remaining = Math.max(0, options.limit - record.count);

  return {
    allowed,
    remaining,
    resetTime: record.resetTime,
  };
}

export function createRateLimitResponse(
  resetTime: number,
  remaining: number,
  limit: number
): NextResponse {
  const now = Date.now();
  const retryAfter = Math.ceil((resetTime - now) / 1000);

  const response = NextResponse.json(
    {
      error: 'Too many requests, please try again later',
      retryAfter: retryAfter,
    },
    { status: 429 }
  );

  response.headers.set('Retry-After', String(retryAfter));
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(resetTime / 1000)));

  return response;
}

export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options: RateLimitOptions
): Promise<NextResponse> {
  const { allowed, remaining, resetTime } = await checkRateLimit(request, options);

  if (!allowed) {
    return createRateLimitResponse(resetTime, remaining, options.limit);
  }

  const response = await handler();

  // Add rate limit headers to successful response
  response.headers.set('X-RateLimit-Limit', String(options.limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(resetTime / 1000)));

  return response;
}

// Cleanup old entries periodically (run every hour)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned up ${cleaned} expired rate limit entries`);
  }
}, 60 * 60 * 1000); // Run every hour
