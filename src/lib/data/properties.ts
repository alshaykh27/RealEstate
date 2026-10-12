import { cacheLife, cacheTag } from "next/cache";

import { getSupabasePublicClient } from "@/lib/supabase/public";
import type {
  ListingType,
  PropertyListItem,
  PropertyStatus,
  PropertyType,
  PropertyWithRelations,
} from "@/types/database";

export type PropertySort = "newest" | "price-asc" | "price-desc";

export interface PropertyFilters {
  listingType?: ListingType;
  propertyType?: PropertyType;
  areaId?: string;
  compound?: string;
  status?: PropertyStatus;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  sort?: PropertySort;
  page?: number;
  pageSize?: number;
}

export interface PropertyListResult {
  items: PropertyListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export const DEFAULT_PAGE_SIZE = 9;

const LIST_SELECT = [
  "id",
  "slug",
  "title_en",
  "title_ar",
  "compound_en",
  "compound_ar",
  "property_type",
  "listing_type",
  "status",
  "price",
  "currency",
  "area_sqm",
  "bedrooms",
  "bathrooms",
  "is_featured",
  "created_at",
  "area:areas(id,slug,name_en,name_ar)",
  "property_images(id,property_id,storage_path,alt_en,alt_ar,width,height,size_bytes,is_cover,sort_order,created_at)",
].join(",");

const DETAIL_SELECT = [
  "*",
  "area:areas(*)",
  "property_images(id,property_id,storage_path,alt_en,alt_ar,width,height,size_bytes,is_cover,sort_order,created_at)",
].join(",");

/** Cached, filtered, paginated list of published properties. */
export async function searchProperties(filters: PropertyFilters = {}): Promise<PropertyListResult> {
  "use cache";
  cacheLife("hours");
  cacheTag("properties");

  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const pageSize = Math.max(1, Math.trunc(filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const from = (page - 1) * pageSize;

  const supabase = getSupabasePublicClient();
  let query = supabase
    .from("properties")
    .select(LIST_SELECT, { count: "exact" })
    .eq("is_published", true)
    .is("deleted_at", null);

  if (filters.listingType) query = query.eq("listing_type", filters.listingType);
  if (filters.propertyType) query = query.eq("property_type", filters.propertyType);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.compound) query = query.eq("compound_en", filters.compound);
  if (filters.bedrooms !== undefined) query = query.gte("bedrooms", filters.bedrooms);
  if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);
  if (filters.minArea !== undefined) query = query.gte("area_sqm", filters.minArea);
  if (filters.maxArea !== undefined) query = query.lte("area_sqm", filters.maxArea);

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(from, from + pageSize - 1);

  if (error) {
    throw new Error(`Failed to search properties: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    items: (data as unknown as PropertyListItem[] | null) ?? [],
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Cached lookup of a single published property with relations. */
export async function getPropertyBySlug(slug: string): Promise<PropertyWithRelations | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("properties", `property-${slug}`);

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load property "${slug}": ${error.message}`);
  }

  return (data as unknown as PropertyWithRelations | null) ?? null;
}

/** Cached featured properties for the home page. */
export async function getFeaturedProperties(limit = 6): Promise<PropertyListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("properties");

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select(LIST_SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load featured properties: ${error.message}`);
  }

  return (data as unknown as PropertyListItem[] | null) ?? [];
}

/** Cached related properties, preferring the same area. */
export async function getRelatedProperties(
  areaId: string | null,
  excludeId: string,
  limit = 3,
): Promise<PropertyListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("properties");

  const supabase = getSupabasePublicClient();
  const collected: PropertyListItem[] = [];
  const seen = new Set<string>([excludeId]);

  if (areaId) {
    const { data, error } = await supabase
      .from("properties")
      .select(LIST_SELECT)
      .eq("is_published", true)
      .is("deleted_at", null)
      .eq("area_id", areaId)
      .neq("id", excludeId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to load related properties: ${error.message}`);
    }

    for (const row of (data as unknown as PropertyListItem[] | null) ?? []) {
      collected.push(row);
      seen.add(row.id);
    }
  }

  if (collected.length < limit) {
    let query = supabase
      .from("properties")
      .select(LIST_SELECT)
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit + seen.size);

    if (areaId) query = query.neq("area_id", areaId);

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load related properties: ${error.message}`);
    }

    for (const row of (data as unknown as PropertyListItem[] | null) ?? []) {
      if (collected.length >= limit) break;
      if (seen.has(row.id)) continue;
      collected.push(row);
      seen.add(row.id);
    }
  }

  return collected;
}

/** A compound suggestion for the listing filter (grouped by area on the client). */
export interface CompoundOption {
  /** Canonical, language-neutral filter value (the stored `compound_en`). */
  key: string;
  name_en: string;
  name_ar: string | null;
  areaId: string | null;
}

/**
 * Cached, de-duplicated list of compounds used by published properties, so the
 * filter can scope the compound dropdown to the selected area.
 */
export async function getPublishedCompounds(): Promise<CompoundOption[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("properties");

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select("compound_en, compound_ar, area_id")
    .eq("is_published", true)
    .is("deleted_at", null)
    .not("compound_en", "is", null);

  if (error) {
    throw new Error(`Failed to load compounds: ${error.message}`);
  }

  const rows =
    (data as unknown as
      | { compound_en: string | null; compound_ar: string | null; area_id: string | null }[]
      | null) ?? [];

  const seen = new Set<string>();
  const compounds: CompoundOption[] = [];
  for (const row of rows) {
    const name = (row.compound_en ?? "").trim();
    if (!name) continue;
    const dedupeKey = `${row.area_id ?? ""}::${name.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    compounds.push({ key: name, name_en: name, name_ar: row.compound_ar, areaId: row.area_id });
  }

  return compounds.sort((a, b) => a.name_en.localeCompare(b.name_en, "en"));
}

/** Cached slugs of all published properties (for generateStaticParams). */
export async function getPublishedPropertySlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("properties");

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("properties")
    .select("slug")
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load property slugs: ${error.message}`);
  }

  return ((data as unknown as { slug: string }[] | null) ?? []).map((row) => row.slug);
}

/** Resolves an old slug to the current published slug, if a redirect exists. */
export async function getSlugRedirect(oldSlug: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("properties");

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("property_slug_history")
    .select("property_id")
    .eq("old_slug", oldSlug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve slug history for "${oldSlug}": ${error.message}`);
  }
  if (!data) return null;

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("slug")
    .eq("id", (data as unknown as { property_id: string }).property_id)
    .eq("is_published", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (propertyError) {
    throw new Error(`Failed to resolve redirect target for "${oldSlug}": ${propertyError.message}`);
  }

  return (property as unknown as { slug: string } | null)?.slug ?? null;
}
