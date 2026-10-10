import type { Locale } from "@/i18n/config";
import type { PropertyImage } from "@/types/database";

export const PROPERTY_IMAGE_BUCKET = "property-images";

/** True when a translated value is present (non-empty string or non-empty array). */
export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Returns the Arabic value for the `ar` locale when present, otherwise falls
 * back to the English base value. English is the required base in the schema.
 */
export function localize<T>(locale: Locale, en: T, ar: T | null | undefined): T {
  return locale === "ar" && hasValue(ar) ? (ar as T) : en;
}

/** Public URL for an object stored in the `property-images` bucket. */
export function propertyImageUrl(storagePath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${PROPERTY_IMAGE_BUCKET}/${storagePath}`;
}

/** Picks the cover image, falling back to the lowest sort order. */
export function coverImage(images: PropertyImage[] | null | undefined): PropertyImage | null {
  if (!images || images.length === 0) return null;
  const cover = images.find((image) => image.is_cover);
  if (cover) return cover;
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;
}

function resolveNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(num) ? num : null;
}

/** Formats a price using locale-aware grouping with the property currency. */
export function formatPrice(locale: Locale, price: number | string, currency: string): string {
  const value = resolveNumber(price);
  if (value === null) return "";
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-EG", {
    style: "currency",
    currency: currency || "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formats a surface area in square metres. */
export function formatArea(locale: Locale, squareMeters: number | string): string {
  const value = resolveNumber(squareMeters);
  if (value === null) return "";
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-EG", {
    maximumFractionDigits: 0,
  }).format(value);
  return locale === "ar" ? `${number} م²` : `${number} m²`;
}

/** Formats a plain integer with locale-aware grouping. */
export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-EG", {
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formats an ISO date. */
export function formatDate(locale: Locale, iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
