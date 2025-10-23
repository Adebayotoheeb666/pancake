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

export function setAuthCookies(access_token: string, refresh_token: string, user_id: string) {
  const cookieStore = cookies();
  cookieStore.set("sb-access-token", access_token, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });
  cookieStore.set("sb-refresh-token", refresh_token, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });
  cookieStore.set("sb-user-id", user_id, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });
}

export function clearAuthCookies() {
  const cookieStore = cookies();
  cookieStore.delete("sb-access-token");
  cookieStore.delete("sb-refresh-token");
  cookieStore.delete("sb-user-id");
}

export function getAuthUserIdFromCookies(): string | null {
  const cookieStore = cookies();
  return cookieStore.get("sb-user-id")?.value ?? null;
}
