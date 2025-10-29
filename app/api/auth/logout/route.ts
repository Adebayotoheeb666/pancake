import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/supabase';
import { withRateLimit, getRateLimitKey } from '@/lib/rate-limit';

async function handleLogout(request: NextRequest) {
  try {
    console.log('[API /auth/logout] Logout request');

    // Clear all auth cookies
    await clearAuthCookies();

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Also explicitly delete cookies in response headers for extra safety
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';

    const deleteCookies = [
      `sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`,
      `sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`,
      `sb-user-id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`,
    ];

    deleteCookies.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });

    console.log('[API /auth/logout] Logout successful');
    return response;
  } catch (error) {
    console.error('[API /auth/logout] Error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    () => handleLogout(request),
    {
      limit: 10, // 10 logout attempts
      windowMs: 15 * 60 * 1000, // 15 minutes
      keyGenerator: (req) => `logout:${getRateLimitKey(req, '')}`,
    }
  );
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
