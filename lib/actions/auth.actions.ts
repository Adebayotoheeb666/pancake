'use server';

import { redirect } from 'next/navigation';
import { supabasePublic } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/supabase';
import { getUserInfo } from './user.actions';

export async function serverSignIn(email: string, password: string) {
  try {
    console.log('[serverSignIn] Starting server-side sign-in for:', email);
    
    const { data: auth, error } = await supabasePublic.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('[serverSignIn] Supabase auth error:', error.message);
      throw new Error('Invalid email or password');
    }

    if (!auth.session || !auth.user) {
      console.error('[serverSignIn] No session or user returned');
      throw new Error('Invalid email or password');
    }

    console.log('[serverSignIn] Auth successful, setting cookies');
    await setAuthCookies(auth.session.access_token, auth.session.refresh_token, auth.user.id);
    
    const user = await getUserInfo({ userId: auth.user.id });
    if (!user) {
      throw new Error('User profile not found');
    }

    console.log('[serverSignIn] Auth complete, redirecting to dashboard');
    redirect('/');
  } catch (error) {
    console.error('[serverSignIn] Error:', error);
    throw error;
  }
}

export async function serverSignUp(userData: {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  ssn: string;
  email: string;
  password: string;
}) {
  try {
    console.log('[serverSignUp] Starting server-side sign-up for:', userData.email);
    
    const { data: auth, error } = await supabasePublic.auth.signUpWithPassword({
      email: userData.email,
      password: userData.password,
    });

    if (error || !auth.user) {
      console.error('[serverSignUp] Supabase auth error:', error?.message);
      throw new Error('Failed to create account');
    }

    // TODO: Create user profile in database
    const userId = auth.user.id;
    
    console.log('[serverSignUp] Auth successful, setting cookies');
    if (auth.session) {
      await setAuthCookies(auth.session.access_token, auth.session.refresh_token, userId);
    }

    console.log('[serverSignUp] Auth complete, redirecting to dashboard');
    redirect('/');
  } catch (error) {
    console.error('[serverSignUp] Error:', error);
    throw error;
  }
}
