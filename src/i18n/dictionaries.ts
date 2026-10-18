import type { Locale } from "./config";
import enDictionary from "./dictionaries/en";
import type { Dictionary } from "./dictionaries/en";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./dictionaries/ar").then((module) => module.default),
  en: () => import("./dictionaries/en").then((module) => module.default),
};

export type { Dictionary };

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

/**
 * Field label in the active locale with an Arabic-to-English fallback: an
 * empty/missing label in the requested dictionary resolves to the English one
 * instead of rendering blank.
 */
export function fieldLabel(dict: Dictionary, key: keyof Dictionary["fields"]): string {
  return dict.fields[key] || enDictionary.fields[key];
}
