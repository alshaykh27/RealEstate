import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Area,
  Property,
  PropertyImage,
  PropertyWithRelations,
  SiteSettings,
} from "@/types/database";

const ADMIN_LIST_SELECT =
  "id, slug, title_en, title_ar, compound_en, compound_ar, property_type, listing_type, status, price, currency, " +
  "is_published, is_featured, is_sample, updated_at, area:areas(id, name_en, name_ar), " +
  "property_images(storage_path, is_cover, sort_order)";

export type AdminPropertyListItem = Pick<
  Property,
  | "id"
  | "slug"
  | "title_en"
  | "title_ar"
  | "compound_en"
  | "compound_ar"
  | "property_type"
  | "listing_type"
  | "status"
  | "price"
  | "currency"
  | "is_published"
  | "is_featured"
  | "is_sample"
  | "updated_at"
> & {
  area: Pick<Area, "id" | "name_en" | "name_ar"> | null;
  property_images: Pick<PropertyImage, "storage_path" | "is_cover" | "sort_order">[];
};

export interface DashboardStats {
  total: number;
  published: number;
  drafts: number;
  available: number;
  sold: number;
  rented: number;
}

/**
 * All properties (any status, including drafts and samples) for the admin list.
 * Not cached — the admin always reads live data through the authed client, whose
 * RLS grants admins full visibility.
 */
export async function getAdminProperties(): Promise<AdminPropertyListItem[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select(ADMIN_LIST_SELECT)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to load properties: ${error.message}`);
  return (data as unknown as AdminPropertyListItem[]) ?? [];
}

/** A single property with its area and images, for the edit screen. */
export async function getAdminProperty(id: string): Promise<PropertyWithRelations | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*, area:areas(*), property_images(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load property: ${error.message}`);
  }
  return (data as unknown as PropertyWithRelations | null) ?? null;
}

/** Every area, active or not, ordered for the settings screen. */
export async function getAdminAreas(): Promise<Area[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load areas: ${error.message}`);
  }

  return (data as unknown as Area[] | null) ?? [];
}

/** Aggregate counts for the dashboard. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("properties").select("is_published, status");

  if (error) {
    throw new Error(`Failed to load dashboard stats: ${error.message}`);
  }

  const rows = (data as unknown as { is_published: boolean; status: Property["status"] }[]) ?? [];

  return {
    total: rows.length,
    published: rows.filter((row) => row.is_published).length,
    drafts: rows.filter((row) => !row.is_published).length,
    available: rows.filter((row) => row.status === "available").length,
    sold: rows.filter((row) => row.status === "sold").length,
    rented: rows.filter((row) => row.status === "rented").length,
  };
}

/** The site settings singleton (admin read; not cached). */
export async function getAdminSettings(): Promise<SiteSettings | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load settings: ${error.message}`);
  }

  return (data as unknown as SiteSettings | null) ?? null;
}

/** Distinct compound names already in use, for the admin form's suggestion list. */
export async function getAdminCompounds(): Promise<string[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select("compound_en")
    .not("compound_en", "is", null);

  if (error) {
    throw new Error(`Failed to load compounds: ${error.message}`);
  }

  const names = new Set<string>();
  for (const row of (data as unknown as { compound_en: string | null }[] | null) ?? []) {
    const name = (row.compound_en ?? "").trim();
    if (name) names.add(name);
  }

  return [...names].sort((a, b) => a.localeCompare(b, "en"));
}

export type { PropertyWithRelations };
