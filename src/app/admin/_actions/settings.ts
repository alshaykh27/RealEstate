"use server";

import { updateTag } from "next/cache";

import { admin } from "@/i18n/admin";
import { requireAdmin } from "@/lib/auth";
import { PROPERTY_IMAGE_BUCKET } from "@/lib/content";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isValidPromoVideoUrl } from "@/lib/video";

export interface SettingsActionState {
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

/** Saves the site_settings singleton (brand, hero copy, contact details). */
export async function updateSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const brandNameEn = str(formData, "brand_name_en");
  const heroHeadlineEn = str(formData, "hero_headline_en");
  const heroSubheadEn = str(formData, "hero_subhead_en");
  const promoVideo = nullable(formData, "promo_video_url");

  if (!brandNameEn || !heroHeadlineEn || !heroSubheadEn) {
    return { error: admin.common.required };
  }

  if (promoVideo && !isValidPromoVideoUrl(promoVideo)) {
    return { error: admin.settings.promoVideoInvalid };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      brand_name_en: brandNameEn,
      brand_name_ar: nullable(formData, "brand_name_ar"),
      hero_headline_en: str(formData, "hero_headline_en"),
      hero_headline_ar: nullable(formData, "hero_headline_ar"),
      hero_subhead_en: str(formData, "hero_subhead_en"),
      hero_subhead_ar: nullable(formData, "hero_subhead_ar"),
      about_en: nullable(formData, "about_en"),
      about_ar: nullable(formData, "about_ar"),
      whatsapp_number: nullable(formData, "whatsapp_number"),
      phone: nullable(formData, "phone"),
      email: nullable(formData, "email"),
      facebook_url: nullable(formData, "facebook_url"),
      promo_video_url: promoVideo,
    })
    .eq("id", 1);

  if (error) return { error: admin.common.genericError };

  updateTag("settings");
  return { ok: true };
}

/** Returns a signed upload target for the brand logo. */
export async function createBrandUploadUrl(): Promise<
  { path: string; token: string } | { error: string }
> {
  await requireAdmin();

  const supabase = await getSupabaseServerClient();
  const path = `brand/logo-${crypto.randomUUID()}.webp`;
  const { data, error } = await supabase.storage
    .from(PROPERTY_IMAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) return { error: admin.images.uploadFailed };
  return { path: data.path, token: data.token };
}

/** Sets (or clears) the brand logo, removing the previous file on success. */
export async function setLogo(path: string | null): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const supabase = await getSupabaseServerClient();
  const { data: current } = await supabase
    .from("site_settings")
    .select("logo_path")
    .eq("id", 1)
    .maybeSingle();

  const previous = (current?.logo_path as string | null) ?? null;

  const { error } = await supabase.from("site_settings").update({ logo_path: path }).eq("id", 1);
  if (error) return { error: admin.common.genericError };

  if (previous && previous !== path) {
    await supabase.storage.from(PROPERTY_IMAGE_BUCKET).remove([previous]);
  }

  updateTag("settings");
  return { ok: true };
}

/** Persists area visibility + ordering. */
export async function updateAreas(
  items: { id: string; isActive: boolean; sortOrder: number }[],
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();

  const supabase = await getSupabaseServerClient();
  for (const item of items) {
    const { error } = await supabase
      .from("areas")
      .update({ is_active: item.isActive, sort_order: item.sortOrder })
      .eq("id", item.id);
    if (error) return { error: admin.common.genericError };
  }

  updateTag("areas");
  return { ok: true };
}
