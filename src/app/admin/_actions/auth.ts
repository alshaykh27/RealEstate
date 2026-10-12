"use server";

import { redirect } from "next/navigation";

import { admin } from "@/i18n/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value: string): string {
  if ((value === "/admin" || value.startsWith("/admin/")) && !value.startsWith("//")) {
    return value;
  }
  return "/admin";
}

export interface LoginState {
  error?: string;
}

/**
 * Signs an admin in with email + password. The admin flag is verified on the
 * same client immediately after sign-in; non-admins are signed straight back
 * out. Authorization is always re-checked server-side (see `requireAdmin`).
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: admin.login.missingFields };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: admin.login.invalid };
  }

  const { data: isAdminFlag, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !isAdminFlag) {
    await supabase.auth.signOut();
    return { error: admin.login.notAdmin };
  }

  redirect(next);
}

/** Clears the session and returns to the login screen. */
export async function logout(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
