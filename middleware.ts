import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has auth cookies
  const authUserIdCookie = request.cookies.get('sb-user-id');

  // Protected routes that require authentication
  const protectedRoutes = ['/', '/my-banks', '/payment-transfer', '/transaction-history'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Auth routes that should redirect to home if already logged in
  const authRoutes = ['/sign-in', '/sign-up'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If trying to access protected route without auth, redirect to sign-in
  if (isProtectedRoute && !authUserIdCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // If already logged in and trying to access auth routes, redirect to home
  if (isAuthRoute && authUserIdCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icons).*)',
  ],
};
