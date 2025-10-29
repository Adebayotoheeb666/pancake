import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY as string;

export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
);

export const supabasePublic: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false },
  }
);

export async function setAuthCookies(access_token: string, refresh_token: string, user_id: string) {
  try {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    console.log('[setAuthCookies] Setting cookies for user:', user_id, 'isProduction:', isProduction);

    cookieStore.set("sb-access-token", access_token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set("sb-refresh-token", refresh_token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set("sb-user-id", user_id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 60 * 60 * 24 * 7,
    });

    console.log('[setAuthCookies] Cookies configured in cookie store');
  } catch (error) {
    console.error('[setAuthCookies] Error setting cookies:', error);
    throw error;
  }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("sb-access-token");
  cookieStore.delete("sb-refresh-token");
  cookieStore.delete("sb-user-id");
}

export async function getAuthUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log('[getAuthUserIdFromCookies] All cookies available:', allCookies.map(c => c.name));

  const userIdCookie = cookieStore.get("sb-user-id");
  console.log('[getAuthUserIdFromCookies] sb-user-id cookie:', userIdCookie ? userIdCookie.value : 'not found');

  return userIdCookie?.value ?? null;
}

export async function getAuthTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value ?? null;
  const refreshToken = cookieStore.get("sb-refresh-token")?.value ?? null;

  return { accessToken, refreshToken };
}

export async function refreshAuthSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("sb-refresh-token")?.value;

    if (!refreshToken) {
      console.log('[refreshAuthSession] No refresh token available');
      return false;
    }

    console.log('[refreshAuthSession] Attempting to refresh session');
    const { data, error } = await supabasePublic.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      console.error('[refreshAuthSession] Refresh failed:', error?.message);
      await clearAuthCookies();
      return false;
    }

    console.log('[refreshAuthSession] Session refreshed successfully');
    await setAuthCookies(
      data.session.access_token,
      data.session.refresh_token,
      data.session.user.id
    );

    return true;
  } catch (error) {
    console.error('[refreshAuthSession] Error:', error);
    return false;
  }
}
