import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has auth cookies
  const authUserIdCookie = request.cookies.get('sb-user-id');
  const accessToken = request.cookies.get('sb-access-token');
  const refreshToken = request.cookies.get('sb-refresh-token');

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

  // Check if access token is expired and refresh if needed
  if (isProtectedRoute && authUserIdCookie && accessToken && refreshToken) {
    try {
      const decoded = jwtDecode(accessToken.value);
      const currentTime = Math.floor(Date.now() / 1000);

      if (decoded.exp && decoded.exp < currentTime) {
        console.log('[middleware] Access token expired, marking for refresh');
        const response = NextResponse.next();
        response.headers.set('x-token-refresh-needed', 'true');
        return response;
      }
    } catch (error) {
      console.error('[middleware] Error decoding token:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icons).*)',
  ],
};
