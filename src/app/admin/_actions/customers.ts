"use server";

import { updateTag } from "next/cache";

import { admin } from "@/i18n/admin";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface CustomerActionState {
  error?: string;
  ok?: boolean;
}

function str(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function nullable(formData: FormData, name: string): string | null {
  const value = str(formData, name);
  return value.length > 0 ? value : null;
}

/** Logs a new customer/lead (name + phone required, notes optional). */
export async function createCustomer(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  await requireAdmin();

  const name = str(formData, "name");
  const phone = str(formData, "phone");

  if (!name || !phone) {
    return { error: admin.common.required };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("customers").insert({
    name,
    phone,
    notes: nullable(formData, "notes"),
  });

  if (error) {
    console.error("[admin:customers:create]", error.message);
    return { error: admin.common.genericError };
  }

  updateTag("customers");
  return { ok: true };
}

/** Permanently removes a logged customer/lead. */
export async function deleteCustomer(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  await requireAdmin();

  const id = str(formData, "id");
  if (!id) return { error: admin.common.genericError };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    console.error("[admin:customers:delete]", error.message);
    return { error: admin.common.genericError };
  }

  updateTag("customers");
  return { ok: true };
}
