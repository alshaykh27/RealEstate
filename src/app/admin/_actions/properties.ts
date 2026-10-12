"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { admin } from "@/i18n/admin";
import { requireAdmin } from "@/lib/auth";
import { PROPERTY_IMAGE_BUCKET } from "@/lib/content";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import type { ListingType, PropertyStatus, PropertyType } from "@/types/database";

export interface PropertyActionState {
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

function numOrNull(formData: FormData, name: string): number | null {
  const raw = str(formData, name);
  if (raw.length === 0) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function intOrNull(formData: FormData, name: string): number | null {
  const value = numOrNull(formData, name);
  return value === null ? null : Math.trunc(value);
}

function linesOrEmpty(formData: FormData, name: string): string[] {
  return str(formData, name)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isUniqueViolation(code: string | undefined): boolean {
  return code === "23505";
}

function buildPayload(formData: FormData) {
  const titleEn = str(formData, "title_en");
  const descriptionEn = str(formData, "description_en");
  const addressEn = str(formData, "address_en");
  const priceRaw = str(formData, "price");

  if (!titleEn || !descriptionEn || !addressEn) {
    return { error: admin.form.missingTitle } as const;
  }
  if (priceRaw.length === 0 || !Number.isFinite(Number(priceRaw)) || Number(priceRaw) < 0) {
    return { error: admin.form.invalidPrice } as const;
  }

  return {
    payload: {
      area_id: nullable(formData, "area_id"),
      property_type: str(formData, "property_type") as PropertyType,
      listing_type: str(formData, "listing_type") as ListingType,
      status: str(formData, "status") as PropertyStatus,
      title_en: titleEn,
      title_ar: nullable(formData, "title_ar"),
      description_en: descriptionEn,
      description_ar: nullable(formData, "description_ar"),
      address_en: addressEn,
      address_ar: nullable(formData, "address_ar"),
      compound_en: nullable(formData, "compound_en"),
      compound_ar: nullable(formData, "compound_ar"),
      features_en: linesOrEmpty(formData, "features_en"),
      features_ar: linesOrEmpty(formData, "features_ar"),
      meta_title_en: nullable(formData, "meta_title_en"),
      meta_title_ar: nullable(formData, "meta_title_ar"),
      meta_description_en: nullable(formData, "meta_description_en"),
      meta_description_ar: nullable(formData, "meta_description_ar"),
      price: Number(priceRaw),
      currency: str(formData, "currency") || "EGP",
      area_sqm: numOrNull(formData, "area_sqm"),
      bedrooms: intOrNull(formData, "bedrooms"),
      bathrooms: intOrNull(formData, "bathrooms"),
      floor: intOrNull(formData, "floor"),
      year_built: intOrNull(formData, "year_built"),
      latitude: numOrNull(formData, "latitude"),
      longitude: numOrNull(formData, "longitude"),
      is_published: formData.get("is_published") === "on",
      is_featured: formData.get("is_featured") === "on",
    },
  } as const;
}

/** Creates a new property (English base required) and opens its edit screen. */
export async function createProperty(
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  await requireAdmin();

  const result = buildPayload(formData);
  if ("error" in result) return { error: result.error };

  const providedSlug = str(formData, "slug");
  const slug = providedSlug || slugify(result.payload.title_en);

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...result.payload, slug })
    .select("id, slug")
    .single();

  if (error) {
    return {
      error: isUniqueViolation(error.code) ? admin.form.slugTaken : admin.common.genericError,
    };
  }

  updateTag("properties");
  updateTag("areas");
  updateTag(`property-${data.slug}`);

  redirect(`/admin/properties/${data.id}/edit?created=1`);
}

/** Updates an existing property. */
export async function updateProperty(
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  await requireAdmin();

  const id = str(formData, "id");
  if (!id) return { error: admin.common.genericError };

  const result = buildPayload(formData);
  if ("error" in result) return { error: result.error };

  const supabase = await getSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from("properties")
    .select("slug, is_published, published_at")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) return { error: admin.common.genericError };

  const providedSlug = str(formData, "slug");
  const slug = providedSlug || (existing.slug as string);
  const nowPublished = result.payload.is_published;
  const wasPublished = existing.is_published as boolean;

  const publishedAt =
    nowPublished && !wasPublished && !existing.published_at
      ? new Date().toISOString()
      : (existing.published_at as string | null);

  const { error } = await supabase
    .from("properties")
    .update({ ...result.payload, slug, published_at: publishedAt })
    .eq("id", id);

  if (error) {
    return {
      error: isUniqueViolation(error.code) ? admin.form.slugTaken : admin.common.genericError,
    };
  }

  updateTag("properties");
  updateTag("areas");
  updateTag(`property-${existing.slug}`);
  updateTag(`property-${slug}`);

  return { ok: true };
}

/** Permanently deletes a property and purges only its own storage objects. */
export async function deleteProperty(
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  await requireAdmin();

  const id = str(formData, "id");
  if (!id) return { error: admin.common.genericError };

  const supabase = await getSupabaseServerClient();
  const { data: property, error: loadError } = await supabase
    .from("properties")
    .select("id, slug, property_images(storage_path)")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !property) return { error: admin.common.genericError };

  const paths =
    (property.property_images as { storage_path: string }[] | null)?.map(
      (image) => image.storage_path,
    ) ?? [];

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(PROPERTY_IMAGE_BUCKET).remove(paths);
    if (removeError) return { error: admin.common.genericError };
  }

  const { error: deleteError } = await supabase.from("properties").delete().eq("id", id);
  if (deleteError) return { error: admin.common.genericError };

  updateTag("properties");
  updateTag("areas");
  updateTag(`property-${property.slug}`);

  redirect("/admin/properties");
}
