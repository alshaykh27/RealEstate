"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { publishProperty, type PropertyActionState } from "@/app/admin/_actions/properties";
import {
  StagedImagePicker,
  type StagedImagePickerHandle,
} from "@/components/admin/staged-image-picker";
import { admin } from "@/i18n/admin";
import { defaultLocale } from "@/i18n/config";
import { listingTypeOptions, propertyTypeOptions, statusOptions } from "@/lib/admin-labels";
import { cn } from "@/lib/utils";
import type { Area, Property } from "@/types/database";

const inputClass =
  "border-line-strong bg-surface text-ink focus-visible:outline-focus-ring w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

function Field({
  label,
  htmlFor,
  hint,
  children,
  ltr,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5" dir={ltr ? "ltr" : undefined}>
      <label htmlFor={htmlFor} className="text-ink text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-ink-muted text-xs">{hint}</p> : null}
    </div>
  );
}

export interface PropertyFormProps {
  mode: "create" | "update";
  action: (state: PropertyActionState, formData: FormData) => Promise<PropertyActionState>;
  areas: Pick<Area, "id" | "name_en" | "name_ar">[];
  compounds?: string[];
  defaults?: Property | null;
}

export function PropertyForm({ mode, action, areas, compounds = [], defaults }: PropertyFormProps) {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [state, setState] = useState<PropertyActionState>({});
  const [working, setWorking] = useState(false);
  const isCreate = mode === "create";
  const formRef = useRef<HTMLFormElement>(null);
  const stagedRef = useRef<StagedImagePickerHandle>(null);

  const v = (value: string | number | null | undefined) =>
    value === null || value === undefined ? "" : String(value);

  const enHidden = cn(lang !== "en" && "hidden");
  const arHidden = cn(lang !== "ar" && "hidden");

  /** Clears the form and staged images and returns focus to the first field. */
  function finishSuccess(propertyId: string, createdSlug: string | undefined, published: boolean) {
    setState({ ok: true, createdId: propertyId, createdSlug, published });
    formRef.current?.reset();
    stagedRef.current?.reset();
    setLang("en");
    formRef.current?.querySelector<HTMLInputElement>("#title_en")?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Uploads the staged images against an already-created draft and publishes it
   * only once every upload succeeded. A property is therefore never published
   * while its images are still missing.
   */
  async function uploadAndFinalize(
    propertyId: string,
    requestedPublished: boolean,
    createdSlug?: string,
  ) {
    const summary = await stagedRef.current?.uploadAll(propertyId);
    const total = summary?.total ?? 0;

    if (summary && summary.failed > 0) {
      setState({
        partial: true,
        createdId: propertyId,
        createdSlug,
        requestedPublished,
        failedCount: summary.failed,
      });
      return;
    }

    // A published property must never exist without its images: if the author
    // asked to publish but staged nothing, keep the draft and explain why.
    if (requestedPublished && total === 0) {
      setState({
        ok: true,
        noImages: true,
        createdId: propertyId,
        createdSlug,
        requestedPublished,
        published: false,
      });
      setLang("en");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    let published = false;
    if (requestedPublished) {
      const result = await publishProperty(propertyId);
      if ("error" in result) {
        setState({ error: result.error, createdId: propertyId, createdSlug, requestedPublished });
        return;
      }
      published = true;
    }

    finishSuccess(propertyId, createdSlug, published);
  }

  // Submitting imperatively (instead of a native `<form action>`) keeps every
  // entered value when the action fails — React's form-action handling would
  // auto-reset the fields. A successful create clears the form and returns to
  // the first field. The whole create → upload → publish sequence disables Save.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    const formData = new FormData(event.currentTarget);
    setWorking(true);
    try {
      // The update form has no staged images and no separate publish step.
      if (!isCreate) {
        setState(await action(state, formData));
        return;
      }

      // Resume the draft created by a previous attempt that did not finish
      // (some uploads failed, or it was held back because it had no images).
      if ((state.partial || state.noImages) && state.createdId) {
        await uploadAndFinalize(
          state.createdId,
          Boolean(state.requestedPublished),
          state.createdSlug,
        );
        return;
      }

      const created = await action({}, formData);
      if (created.error) {
        setState({ error: created.error });
        return;
      }
      if (!created.createdId) {
        setState({ error: admin.common.genericError });
        return;
      }
      await uploadAndFinalize(
        created.createdId,
        Boolean(created.requestedPublished),
        created.createdSlug,
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleRetry(itemId: string) {
    const propertyId = state.createdId;
    if (!propertyId || working) return;
    setWorking(true);
    try {
      const summary = await stagedRef.current?.uploadOne(propertyId, itemId);
      if (!summary) return;

      if (summary.failed > 0) {
        setState({ ...state, partial: true, failedCount: summary.failed });
        return;
      }
      if (!summary.allDone) return;

      let published = Boolean(state.published);
      if (state.requestedPublished) {
        const result = await publishProperty(propertyId);
        if ("error" in result) {
          setState({ ...state, error: result.error });
          return;
        }
        published = true;
      }
      finishSuccess(propertyId, state.createdSlug, published);
    } finally {
      setWorking(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      {isCreate && state.ok && state.createdId ? (
        <div
          role="status"
          className="border-success/30 bg-success-surface flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-5 py-3 text-sm"
        >
          <span className="text-success font-medium">{admin.form.createdSuccess}</span>
          {state.published ? (
            <Link
              href={`/${defaultLocale}/properties/${state.createdSlug}`}
              target="_blank"
              rel="noreferrer"
              className="text-action-navy underline"
            >
              {admin.form.viewProperty}
            </Link>
          ) : (
            <span className="text-ink-muted">
              {state.noImages ? admin.images.publishNeedsImage : admin.form.createdDraftHint}
            </span>
          )}
          <Link
            href={`/admin/properties/${state.createdId}/edit`}
            className="text-action-navy underline"
          >
            {admin.form.manageProperty}
          </Link>
        </div>
      ) : null}
      {isCreate && state.partial && state.createdId ? (
        <div
          role="alert"
          className="border-warning/30 bg-warning-surface flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-5 py-3 text-sm"
        >
          <span className="text-warning font-medium">{admin.images.partialWarning}</span>
          <Link
            href={`/admin/properties/${state.createdId}/edit`}
            className="text-action-navy underline"
          >
            {admin.form.manageProperty}
          </Link>
        </div>
      ) : null}
      <datalist id="compound-options">
        {compounds.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <section className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-ink font-heading text-lg font-semibold">
            {admin.form.sectionContent}
          </h2>
          <div className="border-line inline-flex rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                lang === "en" ? "bg-ink text-white" : "text-ink-secondary",
              )}
            >
              {admin.form.tabEnglish}
            </button>
            <button
              type="button"
              onClick={() => setLang("ar")}
              aria-pressed={lang === "ar"}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                lang === "ar" ? "bg-ink text-white" : "text-ink-secondary",
              )}
            >
              {admin.form.tabArabic}
            </button>
          </div>
        </div>

        <p className="text-ink-muted mb-4 text-xs">
          {lang === "en" ? admin.form.englishBase : admin.form.arabicOptional} —{" "}
          {admin.form.missingTitle}
        </p>

        <div className={cn("flex flex-col gap-4", enHidden)} dir="ltr">
          <Field label={admin.form.titleEn} htmlFor="title_en">
            <input
              id="title_en"
              name="title_en"
              defaultValue={v(defaults?.title_en)}
              required
              className={inputClass}
            />
          </Field>
          <Field label={admin.form.descriptionEn} htmlFor="description_en">
            <textarea
              id="description_en"
              name="description_en"
              defaultValue={v(defaults?.description_en)}
              required
              rows={5}
              className={inputClass}
            />
          </Field>
          <Field label={admin.form.addressEn} htmlFor="address_en">
            <input
              id="address_en"
              name="address_en"
              defaultValue={v(defaults?.address_en)}
              required
              className={inputClass}
            />
          </Field>
          <Field label={admin.form.compoundEn} htmlFor="compound_en" hint={admin.form.compoundHint}>
            <input
              id="compound_en"
              name="compound_en"
              list="compound-options"
              defaultValue={v(defaults?.compound_en)}
              className={inputClass}
            />
          </Field>
          <Field label={admin.form.featuresEn} htmlFor="features_en" hint={admin.form.featuresHint}>
            <textarea
              id="features_en"
              name="features_en"
              defaultValue={(defaults?.features_en ?? []).join("\n")}
              rows={4}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={admin.form.metaTitleEn} htmlFor="meta_title_en">
              <input
                id="meta_title_en"
                name="meta_title_en"
                defaultValue={v(defaults?.meta_title_en)}
                className={inputClass}
              />
            </Field>
            <Field label={admin.form.metaDescriptionEn} htmlFor="meta_description_en">
              <input
                id="meta_description_en"
                name="meta_description_en"
                defaultValue={v(defaults?.meta_description_en)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className={cn("flex flex-col gap-4", arHidden)} dir="rtl">
          <Field label={admin.form.titleAr} htmlFor="title_ar">
            <input
              id="title_ar"
              name="title_ar"
              defaultValue={v(defaults?.title_ar)}
              className={inputClass}
            />
          </Field>
          <Field label={admin.form.descriptionAr} htmlFor="description_ar">
            <textarea
              id="description_ar"
              name="description_ar"
              defaultValue={v(defaults?.description_ar)}
              rows={5}
              className={inputClass}
            />
          </Field>
          <Field label={admin.form.addressAr} htmlFor="address_ar">
            <input
              id="address_ar"
              name="address_ar"
              defaultValue={v(defaults?.address_ar)}
              className={inputClass}
            />
          </Field>
          <Field label={admin.form.compoundAr} htmlFor="compound_ar">
            <input
              id="compound_ar"
              name="compound_ar"
              defaultValue={v(defaults?.compound_ar)}
              className={inputClass}
            />
          </Field>
          <Field label={admin.form.featuresAr} htmlFor="features_ar" hint={admin.form.featuresHint}>
            <textarea
              id="features_ar"
              name="features_ar"
              defaultValue={(defaults?.features_ar ?? []).join("\n")}
              rows={4}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={admin.form.metaTitleAr} htmlFor="meta_title_ar">
              <input
                id="meta_title_ar"
                name="meta_title_ar"
                defaultValue={v(defaults?.meta_title_ar)}
                className={inputClass}
              />
            </Field>
            <Field label={admin.form.metaDescriptionAr} htmlFor="meta_description_ar">
              <input
                id="meta_description_ar"
                name="meta_description_ar"
                defaultValue={v(defaults?.meta_description_ar)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-ink font-heading mb-5 text-lg font-semibold">
          {admin.form.sectionDetails}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label={admin.form.slug} htmlFor="slug" hint={admin.form.slugHint} ltr>
            <input id="slug" name="slug" defaultValue={v(defaults?.slug)} className={inputClass} />
          </Field>

          <Field label={admin.form.area} htmlFor="area_id">
            <select
              id="area_id"
              name="area_id"
              defaultValue={defaults?.area_id ?? ""}
              className={inputClass}
            >
              <option value="">{admin.form.areaNone}</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name_ar || area.name_en}
                </option>
              ))}
            </select>
          </Field>

          <Field label={admin.form.propertyType} htmlFor="property_type">
            <select
              id="property_type"
              name="property_type"
              defaultValue={defaults?.property_type ?? "apartment"}
              className={inputClass}
            >
              {propertyTypeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={admin.form.listingType} htmlFor="listing_type">
            <select
              id="listing_type"
              name="listing_type"
              defaultValue={defaults?.listing_type ?? "sale"}
              className={inputClass}
            >
              {listingTypeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={admin.form.status} htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={defaults?.status ?? "available"}
              className={inputClass}
            >
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={admin.form.price} htmlFor="price" ltr>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={v(defaults?.price)}
              required
              className={inputClass}
            />
          </Field>

          <Field label={admin.form.currency} htmlFor="currency" ltr>
            <input
              id="currency"
              name="currency"
              defaultValue={defaults?.currency ?? "EGP"}
              className={inputClass}
            />
          </Field>

          <Field label={admin.form.areaSqm} htmlFor="area_sqm" ltr>
            <input
              id="area_sqm"
              name="area_sqm"
              type="number"
              min="0"
              step="0.01"
              defaultValue={v(defaults?.area_sqm)}
              className={inputClass}
            />
          </Field>

          <Field label={admin.form.bedrooms} htmlFor="bedrooms" ltr>
            <input
              id="bedrooms"
              name="bedrooms"
              type="number"
              min="0"
              defaultValue={v(defaults?.bedrooms)}
              className={inputClass}
            />
          </Field>

          <Field label={admin.form.bathrooms} htmlFor="bathrooms" ltr>
            <input
              id="bathrooms"
              name="bathrooms"
              type="number"
              min="0"
              defaultValue={v(defaults?.bathrooms)}
              className={inputClass}
            />
          </Field>

          <Field label={admin.form.floor} htmlFor="floor" ltr>
            <input
              id="floor"
              name="floor"
              type="number"
              defaultValue={v(defaults?.floor)}
              className={inputClass}
            />
          </Field>

          <Field label={admin.form.yearBuilt} htmlFor="year_built" ltr>
            <input
              id="year_built"
              name="year_built"
              type="number"
              min="1900"
              max="2100"
              defaultValue={v(defaults?.year_built)}
              className={inputClass}
            />
          </Field>

          <Field label={admin.form.latitude} htmlFor="latitude" ltr>
            <input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              defaultValue={v(defaults?.latitude)}
              className={inputClass}
            />
          </Field>

          <Field label={admin.form.longitude} htmlFor="longitude" ltr>
            <input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              defaultValue={v(defaults?.longitude)}
              className={inputClass}
            />
          </Field>

          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                name="is_published"
                defaultChecked={defaults?.is_published ?? false}
                className="h-4 w-4"
              />
              {admin.form.isPublished}
            </label>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                name="is_featured"
                defaultChecked={defaults?.is_featured ?? false}
                className="h-4 w-4"
              />
              {admin.form.isFeatured}
            </label>
          </div>
        </div>
      </section>

      {isCreate ? (
        <StagedImagePicker ref={stagedRef} busy={working} onRetryItem={handleRetry} />
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={working} className="btn btn-primary text-sm">
          {working
            ? isCreate
              ? admin.form.creating
              : admin.common.saving
            : isCreate
              ? admin.form.create
              : admin.common.saveChanges}
        </button>
        {state.ok && !isCreate ? (
          <span className="text-success text-sm">{admin.common.saved}</span>
        ) : null}
        {state.error ? (
          <span role="alert" className="text-error text-sm">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
