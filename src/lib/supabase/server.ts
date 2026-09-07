import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Server-side Supabase client bound to the request's session cookies. Used by
 * API routes and server components to authenticate the signed-in user.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server components cannot set cookies — ignore refresh failures.
        }
      },
    },
  });
}

export const createSessionClient = createClient;

/** True when the request is signed in with an admin profile. */
export async function isAdminRequest(): Promise<boolean> {
  const admin = await getAdminServiceClient();
  return Boolean(admin);
}

/**
 * Service-role Supabase client gated behind an authenticated admin session.
 * Returns null when the caller is not an admin or storage is unconfigured.
 * Bypasses RLS — only use in server routes after this gate.
 */
export async function getAdminServiceClient() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createServiceClient();
  if (!admin) return null;
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return data?.role === "admin" ? admin : null;
}

/**
 * Admin-only access, or fully open in demo mode (no Supabase configured).
 * Mirrors the behavior of src/proxy.ts, which lets everything through when the
 * app runs without Supabase keys.
 */
export async function isAdminOrDemo(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return true;
  return isAdminRequest();
}
