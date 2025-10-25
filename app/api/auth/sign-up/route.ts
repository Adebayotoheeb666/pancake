import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic, supabaseAdmin } from '@/lib/supabase';

const USERS_TABLE = 'users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, address1, city, state, postalCode, dateOfBirth, ssn, email, password } = body;

    console.log('[API /auth/sign-up] Sign-up request for:', email);
    
    // Create auth user
    const { data: auth, error: authError } = await supabasePublic.auth.signUpWithPassword({
      email,
      password,
    });

    if (authError || !auth.user) {
      console.error('[API /auth/sign-up] Auth error:', authError?.message);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 400 }
      );
    }

    console.log('[API /auth/sign-up] Auth user created:', auth.user.id);

    // Create user profile
    const { data: userData, error: profileError } = await supabaseAdmin
      .from(USERS_TABLE)
      .insert([
        {
          auth_user_id: auth.user.id,
          firstName,
          lastName,
          address1,
          city,
          state,
          postalCode,
          dateOfBirth,
          ssn,
          email,
          dwollaCustomerId: '',
          dwollaFundingId: '',
          appwriteItemId: '',
        },
      ])
      .select()
      .single();

    if (profileError || !userData) {
      console.error('[API /auth/sign-up] Profile creation error:', profileError?.message);
      // Clean up: delete the auth user since profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(auth.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 400 }
      );
    }

    console.log('[API /auth/sign-up] User profile created');

    // Now sign in to get session
    const { data: signInAuth, error: signInError } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInAuth.session) {
      console.error('[API /auth/sign-up] Sign-in error:', signInError?.message);
      return NextResponse.json(
        { error: 'Account created but could not establish session' },
        { status: 400 }
      );
    }

    console.log('[API /auth/sign-up] Session established');

    // Create response with proper Set-Cookie headers
    const response = NextResponse.json({
      success: true,
      user: userData,
      redirectTo: '/',
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 60 * 60 * 24 * 7; // 7 days

    // Manually set Set-Cookie headers
    const secureFlag = isProduction ? '; Secure' : '';
    const setCookieHeaders = [
      `sb-access-token=${signInAuth.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`,
      `sb-refresh-token=${signInAuth.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`,
      `sb-user-id=${auth.user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`,
    ];

    setCookieHeaders.forEach(cookie => {
      response.headers.append('Set-Cookie', cookie);
    });

    console.log('[API /auth/sign-up] Set-Cookie headers added');
    
    return response;
  } catch (error) {
    console.error('[API /auth/sign-up] Error:', error);
    return NextResponse.json(
      { error: 'An error occurred during sign up' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
