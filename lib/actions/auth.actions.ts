'use server';

import { revalidatePath } from 'next/cache';
import { cookies as getCookies } from 'next/headers';
import { supabasePublic } from '@/lib/supabase';
import { setAuthCookies } from '@/lib/supabase';
import { getUserInfo } from './user.actions';

export async function serverSignIn(email: string, password: string) {
  try {
    console.log('[serverSignIn] Starting sign-in for:', email);

    const { data: auth, error } = await supabasePublic.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[serverSignIn] Auth error:', error.message);
      return { success: false, error: 'Invalid email or password' };
    }

    if (!auth.session || !auth.user) {
      console.error('[serverSignIn] No session or user returned');
      return { success: false, error: 'Invalid email or password' };
    }

    console.log('[serverSignIn] Auth successful, user ID:', auth.user.id);
    await setAuthCookies(auth.session.access_token, auth.session.refresh_token, auth.user.id);

    const user = await getUserInfo({ userId: auth.user.id });
    if (!user) {
      console.error('[serverSignIn] User profile not found');
      return { success: false, error: 'User profile not found' };
    }

    console.log('[serverSignIn] Auth complete, revalidating');
    revalidatePath('/');

    return { success: true, redirectTo: '/' };
  } catch (error) {
    console.error('[serverSignIn] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An error occurred' };
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
    console.log('[serverSignUp] Starting sign-up for:', userData.email);

    const { data: auth, error } = await supabasePublic.auth.signUpWithPassword({
      email: userData.email,
      password: userData.password,
    });

    if (error || !auth.user) {
      console.error('[serverSignUp] Auth error:', error?.message);
      return { success: false, error: 'Failed to create account' };
    }

    const userId = auth.user.id;

    console.log('[serverSignUp] Auth successful, setting cookies');
    if (auth.session) {
      await setAuthCookies(auth.session.access_token, auth.session.refresh_token, userId);
    } else {
      console.log('[serverSignUp] No session, waiting for email confirmation');
    }

    console.log('[serverSignUp] Auth complete, revalidating');
    revalidatePath('/');

    return { success: true, redirectTo: '/', user: { id: userId, email: userData.email } };
  } catch (error) {
    console.error('[serverSignUp] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An error occurred' };
  }
}
