"use server";

import { updateTag } from "next/cache";

import { admin } from "@/i18n/admin";
import { requireAdmin } from "@/lib/auth";
import { MAX_PROPERTY_IMAGES, PROPERTY_IMAGE_BUCKET } from "@/lib/content";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 3145728;

export interface UploadTarget {
  path: string;
  token: string;
}

export interface ImageRow {
  id: string;
  property_id: string;
  storage_path: string;
  alt_en: string;
  alt_ar: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
}

async function propertySlug(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  id: string,
) {
  const { data } = await supabase.from("properties").select("slug").eq("id", id).maybeSingle();
  return (data?.slug as string | undefined) ?? null;
}

function revalidateProperty(slug: string | null) {
  updateTag("properties");
  updateTag("areas");
  if (slug) updateTag(`property-${slug}`);
}

/**
 * Authorizes an upload and returns a Supabase signed upload target. The browser
 * compresses to WebP and uploads directly with the returned token, so large
 * files never pass through a Server Action body.
 */
export async function createImageUploadUrl(
  propertyId: string,
): Promise<UploadTarget | { error: string }> {
  await requireAdmin();

  const supabase = await getSupabaseServerClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();

  if (!property) return { error: admin.common.genericError };

  const { count } = await supabase
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if ((count ?? 0) >= MAX_PROPERTY_IMAGES) {
    return { error: admin.images.limitReached };
  }

  const path = `properties/${propertyId}/${crypto.randomUUID()}.webp`;
  const { data, error } = await supabase.storage
    .from(PROPERTY_IMAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) return { error: admin.images.uploadFailed };

  return { path: data.path, token: data.token };
}

/** Records an uploaded image; the first image becomes the cover. */
export async function finalizeImage(input: {
  propertyId: string;
  storagePath: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  altEn: string;
  altAr: string | null;
}): Promise<ImageRow | { error: string }> {
  await requireAdmin();

  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_IMAGE_BYTES) {
    return { error: admin.images.tooLarge };
  }

  const supabase = await getSupabaseServerClient();

  const { data: existing } = await supabase
    .from("property_images")
    .select("id, sort_order, is_cover")
    .eq("property_id", input.propertyId);

  const rows = (existing as { id: string; sort_order: number; is_cover: boolean }[] | null) ?? [];
  if (rows.length >= MAX_PROPERTY_IMAGES) {
    return { error: admin.images.limitReached };
  }

  const nextOrder = rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;
  const hasCover = rows.some((row) => row.is_cover);

  const { data, error } = await supabase
    .from("property_images")
    .insert({
      property_id: input.propertyId,
      storage_path: input.storagePath,
      alt_en: input.altEn,
      alt_ar: input.altAr,
      width: input.width,
      height: input.height,
      size_bytes: input.sizeBytes,
      is_cover: !hasCover,
      sort_order: nextOrder,
    })
    .select("*")
    .single();

  if (error || !data) return { error: admin.images.uploadFailed };

  revalidateProperty(await propertySlug(supabase, input.propertyId));
  return data as unknown as ImageRow;
}

/** Sets one image as the sole cover for its property. */
export async function setCover(
  propertyId: string,
  imageId: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const supabase = await getSupabaseServerClient();
  const { error: clearError } = await supabase
    .from("property_images")
    .update({ is_cover: false })
    .eq("property_id", propertyId);
  if (clearError) return { error: admin.common.genericError };

  const { error } = await supabase
    .from("property_images")
    .update({ is_cover: true })
    .eq("id", imageId)
    .eq("property_id", propertyId);
  if (error) return { error: admin.common.genericError };

  revalidateProperty(await propertySlug(supabase, propertyId));
  return { ok: true };
}

/** Persists a new image order. */
export async function reorderImages(
  propertyId: string,
  orderedIds: string[],
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const supabase = await getSupabaseServerClient();
  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from("property_images")
      .update({ sort_order: index })
      .eq("id", orderedIds[index])
      .eq("property_id", propertyId);
    if (error) return { error: admin.common.genericError };
  }

  revalidateProperty(await propertySlug(supabase, propertyId));
  return { ok: true };
}

/** Updates an image's alt text (per locale). */
export async function updateImageAlt(
  propertyId: string,
  imageId: string,
  altEn: string,
  altAr: string | null,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("property_images")
    .update({ alt_en: altEn, alt_ar: altAr })
    .eq("id", imageId)
    .eq("property_id", propertyId);
  if (error) return { error: admin.common.genericError };

  revalidateProperty(await propertySlug(supabase, propertyId));
  return { ok: true };
}

/** Deletes an image's storage object and row; reassigns the cover if needed. */
export async function removeImage(
  propertyId: string,
  imageId: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const supabase = await getSupabaseServerClient();
  const { data: image, error: loadError } = await supabase
    .from("property_images")
    .select("id, storage_path, is_cover")
    .eq("id", imageId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (loadError || !image) return { error: admin.common.genericError };

  const { error: removeError } = await supabase.storage
    .from(PROPERTY_IMAGE_BUCKET)
    .remove([image.storage_path as string]);
  if (removeError) return { error: admin.common.genericError };

  const { error: deleteError } = await supabase.from("property_images").delete().eq("id", imageId);
  if (deleteError) return { error: admin.common.genericError };

  if (image.is_cover) {
    const { data: remaining } = await supabase
      .from("property_images")
      .select("id")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .limit(1);
    const next = (remaining as { id: string }[] | null)?.[0];
    if (next) {
      await supabase.from("property_images").update({ is_cover: true }).eq("id", next.id);
    }
  }

  revalidateProperty(await propertySlug(supabase, propertyId));
  return { ok: true };
}
