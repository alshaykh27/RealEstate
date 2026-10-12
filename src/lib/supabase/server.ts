import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see .env.example).",
    );
  }
  return { url, anonKey };
}

export async function getSupabaseServerClient() {
  // The authenticated client is inherently request-bound: it reads the session
  // cookie and Supabase's auth client (GoTrueClient) reads `Date.now()` while
  // bootstrapping. Awaiting `connection()` first keeps that work out of any
  // prerender pass (it stalls prerendering and is a no-op at request time),
  // which is what Cache Components requires for per-request values.
  await connection();

  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component where cookies cannot be set.
          // Route handlers / middleware will handle session writes instead.
        }
      },
    },
  });
}
