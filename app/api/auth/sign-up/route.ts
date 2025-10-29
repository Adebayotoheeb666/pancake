import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic, supabaseAdmin } from '@/lib/supabase';
import { withRateLimit, getRateLimitKey } from '@/lib/rate-limit';

const USERS_TABLE = 'users';

async function handleSignUp(request: NextRequest) {
  let body;

  try {
    body = await request.json();
  } catch (parseError) {
    console.error('[API /auth/sign-up] Failed to parse request body:', parseError);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { firstName, lastName, address1, city, state, postalCode, dateOfBirth, ssn, email, password } = body;

  console.log('[API /auth/sign-up] Sign-up request for:', email);

  try {
    // Create auth user using admin client with email confirmed
    const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !auth.user) {
      console.error('[API /auth/sign-up] Auth error:', authError?.message);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
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
          first_name: firstName,
          last_name: lastName,
          address1,
          city,
          state,
          postal_code: postalCode,
          date_of_birth: dateOfBirth,
          ssn,
          email,
        },
      ])
      .select()
      .single();

    if (profileError || !userData) {
      console.error('[API /auth/sign-up] Profile creation error:', profileError?.message);
      try {
        await supabaseAdmin.auth.admin.deleteUser(auth.user.id);
      } catch (deleteError) {
        console.error('[API /auth/sign-up] Failed to cleanup auth user:', deleteError);
      }
      return NextResponse.json(
        { error: profileError?.message || 'Failed to create user profile' },
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
        { error: signInError?.message || 'Account created but could not establish session' },
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
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign up';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    () => handleSignUp(request),
    {
      limit: 3, // 3 attempts
      windowMs: 60 * 60 * 1000, // 1 hour
      keyGenerator: (req) => `sign-up:${getRateLimitKey(req, '')}`,
    }
  );
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
