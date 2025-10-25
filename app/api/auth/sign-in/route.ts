import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase';

function setCookieHeader(token: string, name: string, isProduction: boolean): string {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  let cookieString = `${name}=${encodeURIComponent(token)}`;
  cookieString += `; Max-Age=${maxAge}`;
  cookieString += '; Path=/';
  cookieString += '; SameSite=Lax';
  cookieString += '; HttpOnly';
  if (isProduction) {
    cookieString += '; Secure';
  }
  return cookieString;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('[API /auth/sign-in] Sign-in request for:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { data: auth, error } = await supabasePublic.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[API /auth/sign-in] Supabase auth error:', error.message);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!auth.session || !auth.user) {
      console.error('[API /auth/sign-in] No session or user returned');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('[API /auth/sign-in] Auth successful, user ID:', auth.user.id);

    const isProduction = process.env.NODE_ENV === 'production';

    // Create response
    const response = NextResponse.json({
      success: true,
      redirectTo: '/'
    });

    // Set cookies using both methods for reliability
    const accessTokenCookie = setCookieHeader(auth.session.access_token, 'sb-access-token', isProduction);
    const refreshTokenCookie = setCookieHeader(auth.session.refresh_token, 'sb-refresh-token', isProduction);
    const userIdCookie = setCookieHeader(auth.user.id, 'sb-user-id', isProduction);

    // Set via response headers (most reliable)
    response.headers.append('Set-Cookie', accessTokenCookie);
    response.headers.append('Set-Cookie', refreshTokenCookie);
    response.headers.append('Set-Cookie', userIdCookie);

    // Also set via cookies API for backup
    response.cookies.set('sb-access-token', auth.session.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set('sb-refresh-token', auth.session.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    response.cookies.set('sb-user-id', auth.user.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    console.log('[API /auth/sign-in] Cookies set in response headers');

    return response;
  } catch (error) {
    console.error('[API /auth/sign-in] Error:', error);
    return NextResponse.json(
      { error: 'An error occurred during sign in' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}
