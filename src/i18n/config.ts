/**
 * Locale configuration — single source of truth for supported locales.
 * Routing uses sub-path locales (`/ar/...`, `/en/...`). First visit with no
 * stored preference defaults to `defaultLocale` (English).
 */
export const locales = ["ar", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeCookieName = "NEXT_LOCALE";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
