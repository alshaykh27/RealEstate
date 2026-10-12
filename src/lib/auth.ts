import { redirect } from "next/navigation";
import { cache } from "react";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string | null;
}

/** Current signed-in user (any role), or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
});

/** Whether the current session belongs to an admin (`public.profiles.is_admin`). */
export const isAdmin = cache(async (): Promise<boolean> => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return Boolean(data);
});

/** Current user only if they are an admin; otherwise null. */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!(await isAdmin())) return null;
  return user;
});

/**
 * Authoritative admin gate for server components and Server Actions. Redirects
 * to the login screen when the session is missing or not an admin. Never rely on
 * hiding UI — RLS re-checks every write via `public.is_admin()`.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return admin;
}
