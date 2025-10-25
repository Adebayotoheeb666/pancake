import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase';

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

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      redirectTo: '/'
    });

    // Set cookies directly on the response
    const isProduction = process.env.NODE_ENV === 'production';
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

    console.log('[API /auth/sign-in] Cookies set in response');

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
