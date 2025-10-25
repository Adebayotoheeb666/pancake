import { signIn } from '@/lib/actions/user.actions';
import { setAuthCookies } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('[API /auth/sign-in] Sign-in request for:', email);
    
    const { data: auth, error } = await supabasePublic.auth.signInWithPassword({ email, password });
    
    if (error || !auth.session || !auth.user) {
      console.log('[API /auth/sign-in] Auth failed:', error?.message);
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
