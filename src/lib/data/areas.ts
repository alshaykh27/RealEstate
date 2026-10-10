import { cacheLife, cacheTag } from "next/cache";

import { getSupabasePublicClient } from "@/lib/supabase/public";
import type { Area } from "@/types/database";

/** Cached list of active areas, ordered for display. */
export async function getAreas(): Promise<Area[]> {
  "use cache";
  cacheLife("days");
  cacheTag("areas");

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load areas: ${error.message}`);
  }

  return (data as unknown as Area[] | null) ?? [];
}

/** Cached lookup of a single active area by slug. */
export async function getAreaBySlug(slug: string): Promise<Area | null> {
  "use cache";
  cacheLife("days");
  cacheTag("areas", `area-${slug}`);

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load area "${slug}": ${error.message}`);
  }

  return (data as unknown as Area | null) ?? null;
}

/** Cached map of area id -> published property count. */
export async function getPublishedCountsByArea(): Promise<Record<string, number>> {
  "use cache";
  cacheLife("hours");
  cacheTag("areas", "properties");

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select("area_id")
    .eq("is_published", true)
    .is("deleted_at", null)
    .not("area_id", "is", null);

  if (error) {
    throw new Error(`Failed to load area counts: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  for (const row of (data as unknown as { area_id: string }[] | null) ?? []) {
    counts[row.area_id] = (counts[row.area_id] ?? 0) + 1;
  }
  return counts;
}
