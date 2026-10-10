import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/i18n/config";

/**
 * Builds locale-aware `alternates` (canonical + hreflang set) for a route.
 * `path` is locale-independent, e.g. "" for home or "properties/foo".
 */
export function localeAlternates(locale: Locale, path = ""): Metadata["alternates"] {
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";
  return {
    canonical: `/${locale}${suffix}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${suffix}`])),
      "x-default": `/${defaultLocale}${suffix}`,
    },
  };
}
