import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase';
import { getUserInfo } from '@/lib/actions/user.actions';

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
    
    // Verify user profile exists
    const user = await getUserInfo({ userId: auth.user.id });
    if (!user) {
      console.error('[API /auth/sign-in] User profile not found');
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 401 }
      );
    }

    // Create response with proper Set-Cookie headers
    const response = NextResponse.json({ 
      success: true,
      user: user,
      redirectTo: '/'
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    
    // Set cookies using proper HTTP Set-Cookie format
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: isProduction,
      maxAge: maxAge,
      path: '/',
    };

    response.cookies.set('sb-access-token', auth.session.access_token, cookieOptions);
    response.cookies.set('sb-refresh-token', auth.session.refresh_token, cookieOptions);
    response.cookies.set('sb-user-id', auth.user.id, cookieOptions);

    console.log('[API /auth/sign-in] Cookies set via NextResponse.cookies');
    
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
  return new NextResponse(null, { status: 200 });
}
