import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has auth cookies
  const authUserIdCookie = request.cookies.get('sb-user-id');

  // Auth routes that should redirect to home if already logged in
  const authRoutes = ['/sign-in', '/sign-up'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Protected routes that require authentication (check these AFTER auth routes to avoid conflicts)
  const protectedRoutes = ['/', '/my-banks', '/payment-transfer', '/transaction-history'];
  const isProtectedRoute = !isAuthRoute && protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  // If trying to access protected route without auth, redirect to sign-in
  if (isProtectedRoute && !authUserIdCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // If already logged in and trying to access auth routes, redirect to home
  if (isAuthRoute && authUserIdCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy header
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://plaid.com https://*.plaid.com https://gekadgjhqinrtcccueab.supabase.co https://*.opaydemo.com https://api.flutterwave.com https://api.paystack.co https://api.monnify.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );

  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icons).*)',
  ],
};
