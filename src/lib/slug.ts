/**
 * Generates a URL slug from the English base title. Lowercases, strips
 * diacritics, and collapses anything that isn't a letter or digit into single
 * hyphens. Arabic text is transliterated nowhere — slugs are English-based by
 * design (one shared slug per property across locales).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Appends a short random suffix so a generated slug does not collide. Callers
 * should still handle a unique-violation from the DB (e.g. manual slugs).
 */
export function slugifyWithSuffix(input: string, suffix: string): string {
  const base = slugify(input) || "property";
  return `${base}-${suffix}`;
}
