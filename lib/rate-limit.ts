import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

// In-memory store for rate limiting (for single instance)
// For production with multiple instances, use Redis
const rateLimitStore: RateLimitStore = {};

export interface RateLimitOptions {
  limit: number; // Number of requests allowed
  windowMs: number; // Time window in milliseconds
  keyGenerator?: (request: NextRequest) => string;
}

export function getRateLimitKey(request: NextRequest, prefix: string): string {
  // Use IP address or user ID as the key
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
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
