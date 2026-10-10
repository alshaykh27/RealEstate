import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Anonymous Supabase client for public, cached reads.
 *
 * This client never touches request-scoped APIs (cookies/headers), so it is
 * safe to call from inside `"use cache"` functions. Sessions are disabled
 * because the public site only performs anonymous, RLS-guarded reads.
 */
export function getSupabasePublicClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  return cached;
}
