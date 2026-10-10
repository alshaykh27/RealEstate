import { cacheLife, cacheTag } from "next/cache";

import { getSupabasePublicClient } from "@/lib/supabase/public";
import type { SiteSettings } from "@/types/database";

const SETTINGS_ID = 1;

/** Cached site-wide settings row (brand, hero copy, contact details). */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load site settings: ${error.message}`);
  }

  return (data as unknown as SiteSettings | null) ?? null;
}

/** Cached current year for the footer copyright line. */
export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
