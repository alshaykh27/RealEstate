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
  createdId?: string;
  createdSlug?: string;
  requestedPublished?: boolean;
  published?: boolean;
  partial?: boolean;
  failedCount?: number;
  /** The author asked to publish but no image had been staged: kept as draft. */
  noImages?: boolean;
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

function logDbError(
  context: string,
  error: { code?: string; message?: string; details?: string | null; hint?: string | null },
): void {
  console.error(
    `[admin:properties:${context}]`,
    JSON.stringify({
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    }),
  );
}

/**
 * Turns a Postgres/PostgREST error into a specific admin-facing message so the
 * UI never shows a blanket "generic error". Unmapped codes stay generic.
 */
function messageForDbError(error: { code?: string; message?: string }): string {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "23505" || message.includes("was used previously")) return admin.form.slugTaken;
  if (code === "23503") return admin.form.errorInvalidArea;
  if (code === "22003") return admin.form.errorPriceTooLarge;
  if (code === "22001") return admin.form.errorTooLong;
  if (code === "23514") {
    if (message.includes("year_built")) return admin.form.errorYearRange;
    if (message.includes("latitude") || message.includes("longitude")) {
      return admin.form.errorCoordinates;
    }
    if (message.includes("area_sqm")) return admin.form.errorAreaSqm;
    if (message.includes("bedrooms") || message.includes("bathrooms")) return admin.form.errorRooms;
    return admin.form.errorOutOfRange;
  }
  return admin.common.genericError;
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

/**
 * Creates a new property (English base required) **as a draft** and returns its
 * id/slug plus whether the author asked to publish it. The add form then uploads
 * its staged images and calls {@link publishProperty} only once every upload has
 * succeeded, so a published property never exists without its images.
 */
export async function createProperty(
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  await requireAdmin();

  const result = buildPayload(formData);
  if ("error" in result) return { error: result.error };

  const providedSlug = str(formData, "slug");
  const slug = providedSlug || slugify(result.payload.title_en);
  if (!slug) return { error: admin.form.errorSlugRequired };

  const requestedPublished = result.payload.is_published;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...result.payload, is_published: false, slug })
    .select("id, slug")
    .single();

  if (error) {
    logDbError("create", error);
    return { error: messageForDbError(error) };
  }

  updateTag("properties");
  updateTag("areas");
  updateTag(`property-${data.slug}`);

  return {
    ok: true,
    createdId: data.id as string,
    createdSlug: data.slug as string,
    requestedPublished,
  };
}

/**
 * Publishes a property that was just created as a draft. Called by the add form
 * after every staged image has uploaded successfully.
 */
export async function publishProperty(id: string): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const supabase = await getSupabaseServerClient();
  const { data: existing, error: loadError } = await supabase
    .from("properties")
    .select("slug, is_published, published_at")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    if (loadError) logDbError("publish:load", loadError);
    return { error: admin.common.genericError };
  }

  if (existing.is_published) return { ok: true };

  const { error } = await supabase
    .from("properties")
    .update({
      is_published: true,
      published_at: (existing.published_at as string | null) ?? new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    logDbError("publish", error);
    return { error: admin.common.genericError };
  }

  updateTag("properties");
  updateTag("areas");
  updateTag(`property-${existing.slug}`);

  return { ok: true };
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

  if (existingError || !existing) {
    if (existingError) logDbError("update:load", existingError);
    return { error: admin.common.genericError };
  }

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
    logDbError("update", error);
    return { error: messageForDbError(error) };
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
