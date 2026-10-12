"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";

import {
  createBrandUploadUrl,
  setLogo,
  updateSettings,
  type SettingsActionState,
} from "@/app/admin/_actions/settings";
import { admin } from "@/i18n/admin";
import { PROPERTY_IMAGE_BUCKET, propertyImageUrl } from "@/lib/content";
import { compressToWebp, isAcceptedImageType, MAX_IMAGE_BYTES } from "@/lib/image-compress";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isValidPromoVideoUrl, parsePromoVideo, youtubeThumbnailUrl } from "@/lib/video";
import type { SiteSettings } from "@/types/database";

const inputClass =
  "border-line-strong bg-surface text-ink focus-visible:outline-focus-ring w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

function Field({
  label,
  htmlFor,
  children,
  ltr,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5" dir={ltr ? "ltr" : undefined}>
      <label htmlFor={htmlFor} className="text-ink text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function v(value: string | null | undefined) {
  return value ?? "";
}

export function SettingsForm({ settings }: { settings: SiteSettings | null }) {
  const [state, formAction, isPending] = useActionState<SettingsActionState, FormData>(
    updateSettings,
    {},
  );
  const [logoPath, setLogoPath] = useState<string | null>(settings?.logo_path ?? null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [promoVideo, setPromoVideo] = useState(settings?.promo_video_url ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const promoVideoInvalid = promoVideo.trim().length > 0 && !isValidPromoVideoUrl(promoVideo);
  const promoVideoPreview = parsePromoVideo(promoVideo);

  async function onLogoSelected(file: File | undefined) {
    if (!file) return;
    setLogoError(null);

    try {
      if (!isAcceptedImageType(file.type)) throw new Error("type");

      const target = await createBrandUploadUrl();
      if ("error" in target) throw new Error("upload");

      const compressed = await compressToWebp(file).catch(() => {
        throw new Error("compress");
      });
      if (compressed.blob.size > MAX_IMAGE_BYTES) throw new Error("tooLarge");

      setLogoBusy(true);
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.storage
        .from(PROPERTY_IMAGE_BUCKET)
        .uploadToSignedUrl(target.path, target.token, compressed.blob, {
          contentType: "image/webp",
        });
      if (error) throw new Error("upload");

      const saved = await setLogo(target.path);
      if ("error" in saved) throw new Error("upload");
      setLogoPath(target.path);
    } catch (error) {
      const key = error instanceof Error ? error.message : "";
      setLogoError(
        key === "type"
          ? admin.images.badType
          : key === "tooLarge"
            ? admin.images.tooLarge
            : key === "compress"
              ? admin.images.compressFailed
              : admin.images.uploadFailed,
      );
    } finally {
      setLogoBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onLogoRemove() {
    setLogoBusy(true);
    setLogoError(null);
    const result = await setLogo(null);
    if ("error" in result) setLogoError(result.error);
    else setLogoPath(null);
    setLogoBusy(false);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-ink font-heading mb-5 text-lg font-semibold">{admin.settings.brand}</h2>

        <div className="mb-5 flex flex-wrap items-center gap-4">
          <div className="bg-surface-cream border-line relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border">
            {logoPath ? (
              <Image
                src={propertyImageUrl(logoPath)}
                alt={admin.settings.logo}
                fill
                sizes="80px"
                className="object-contain"
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-ink-muted text-xs">{admin.settings.logoHint}</p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => onLogoSelected(event.target.files?.[0])}
              />
              <button
                type="button"
                disabled={logoBusy}
                onClick={() => inputRef.current?.click()}
                className="btn btn-secondary-light text-sm"
              >
                {logoBusy ? admin.images.uploading : admin.settings.logoUpload}
              </button>
              {logoPath ? (
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={onLogoRemove}
                  className="text-error text-sm font-medium hover:underline"
                >
                  {admin.settings.logoRemove}
                </button>
              ) : null}
            </div>
            {logoError ? (
              <p role="alert" className="text-error text-xs">
                {logoError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={admin.settings.brandNameEn} htmlFor="brand_name_en" ltr>
            <input
              id="brand_name_en"
              name="brand_name_en"
              defaultValue={v(settings?.brand_name_en)}
              required
              className={inputClass}
            />
          </Field>
          <Field label={admin.settings.brandNameAr} htmlFor="brand_name_ar">
            <input
              id="brand_name_ar"
              name="brand_name_ar"
              defaultValue={v(settings?.brand_name_ar)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-ink font-heading mb-5 text-lg font-semibold">{admin.settings.hero}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={admin.settings.heroHeadlineEn} htmlFor="hero_headline_en" ltr>
            <input
              id="hero_headline_en"
              name="hero_headline_en"
              defaultValue={v(settings?.hero_headline_en)}
              required
              className={inputClass}
            />
          </Field>
          <Field label={admin.settings.heroHeadlineAr} htmlFor="hero_headline_ar">
            <input
              id="hero_headline_ar"
              name="hero_headline_ar"
              defaultValue={v(settings?.hero_headline_ar)}
              className={inputClass}
            />
          </Field>
          <Field label={admin.settings.heroSubheadEn} htmlFor="hero_subhead_en" ltr>
            <textarea
              id="hero_subhead_en"
              name="hero_subhead_en"
              defaultValue={v(settings?.hero_subhead_en)}
              required
              rows={3}
              className={inputClass}
            />
          </Field>
          <Field label={admin.settings.heroSubheadAr} htmlFor="hero_subhead_ar">
            <textarea
              id="hero_subhead_ar"
              name="hero_subhead_ar"
              defaultValue={v(settings?.hero_subhead_ar)}
              rows={3}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label={admin.settings.promoVideo} htmlFor="promo_video_url" ltr>
            <input
              id="promo_video_url"
              name="promo_video_url"
              type="url"
              dir="ltr"
              inputMode="url"
              placeholder={admin.settings.promoVideoPlaceholder}
              value={promoVideo}
              onChange={(event) => setPromoVideo(event.target.value)}
              aria-invalid={promoVideoInvalid || undefined}
              className={inputClass}
            />
          </Field>
          <p className="text-ink-muted mt-1.5 text-xs">{admin.settings.promoVideoHint}</p>
          {promoVideoInvalid ? (
            <p role="alert" className="text-error mt-1.5 text-xs">
              {admin.settings.promoVideoInvalid}
            </p>
          ) : null}
          {promoVideoPreview ? (
            <div className="mt-3">
              <p className="text-ink-muted mb-1.5 text-xs">{admin.settings.promoVideoPreview}</p>
              {promoVideoPreview.kind === "youtube" ? (
                // eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail, not eligible for the Next image optimizer
                <img
                  src={youtubeThumbnailUrl(promoVideoPreview.id)}
                  alt={admin.settings.promoVideoPreview}
                  className="border-line h-40 w-full max-w-xs rounded-lg border object-cover"
                />
              ) : (
                <video
                  src={promoVideoPreview.url}
                  controls
                  muted
                  preload="metadata"
                  className="border-line h-40 w-full max-w-xs rounded-lg border object-cover"
                />
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-ink font-heading mb-5 text-lg font-semibold">{admin.settings.about}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={admin.settings.aboutEn} htmlFor="about_en" ltr>
            <textarea
              id="about_en"
              name="about_en"
              defaultValue={v(settings?.about_en)}
              rows={4}
              className={inputClass}
            />
          </Field>
          <Field label={admin.settings.aboutAr} htmlFor="about_ar">
            <textarea
              id="about_ar"
              name="about_ar"
              defaultValue={v(settings?.about_ar)}
              rows={4}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-ink font-heading mb-5 text-lg font-semibold">
          {admin.settings.contact}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={admin.settings.whatsapp} htmlFor="whatsapp_number" ltr>
            <input
              id="whatsapp_number"
              name="whatsapp_number"
              defaultValue={v(settings?.whatsapp_number)}
              className={inputClass}
            />
          </Field>
          <Field label={admin.settings.phone} htmlFor="phone" ltr>
            <input
              id="phone"
              name="phone"
              defaultValue={v(settings?.phone)}
              className={inputClass}
            />
          </Field>
          <Field label={admin.settings.email} htmlFor="email" ltr>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={v(settings?.email)}
              className={inputClass}
            />
          </Field>
          <Field label={admin.settings.facebook} htmlFor="facebook_url" ltr>
            <input
              id="facebook_url"
              name="facebook_url"
              defaultValue={v(settings?.facebook_url)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className="btn btn-primary text-sm">
          {isPending ? admin.common.saving : admin.common.saveChanges}
        </button>
        {state.ok ? <span className="text-success text-sm">{admin.settings.savedOk}</span> : null}
        {state.error ? (
          <span role="alert" className="text-error text-sm">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
