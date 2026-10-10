/**
 * HERO BACKGROUND IMAGERY — PLACEHOLDER (STOCK).
 *
 * These are free, commercially-licensed stock photographs (Unsplash / Pexels
 * licenses), self-hosted under `public/hero/` so there is no third-party CDN
 * dependency and no `remotePatterns` change. They are NOT the client's
 * properties and exist only so the hero reads as real, cinematic photography
 * until the client's own shoot is available.
 *
 * REPLACE LATER: swap each `src` for a client cover photo (or drop in real
 * files at the same paths) and delete the `stock: true` flag / this header.
 * No component logic needs to change — the hero maps over this array.
 *
 * Licensing: both licenses permit free commercial use. Attribution is kept
 * below as good practice even where not strictly required.
 */
export type HeroImage = {
  /** Path under `public/`. */
  src: string;
  /** Marks placeholder stock content that must be replaced with client photos. */
  stock: true;
  /** Alt is intentionally empty — decorative background only. */
  credit: string;
  source: string;
  license: "Unsplash License" | "Pexels License";
};

export const HERO_IMAGES: readonly HeroImage[] = [
  {
    src: "/hero/hero-01-villa-sunset.jpg",
    stock: true,
    credit: "Ahmet ÇÖTÜR · Pexels",
    source: "https://www.pexels.com/photo/31817160/",
    license: "Pexels License",
  },
  {
    src: "/hero/hero-02-desert-golden.jpg",
    stock: true,
    credit: "Unsplash",
    source: "https://unsplash.com/photos/so3wgJLwDxo",
    license: "Unsplash License",
  },
  {
    src: "/hero/hero-03-home-dusk.jpg",
    stock: true,
    credit: "Diego Marín · Unsplash",
    source: "https://unsplash.com/photos/eG3YGzIPjjg",
    license: "Unsplash License",
  },
  {
    src: "/hero/hero-04-interior-golden.jpg",
    stock: true,
    credit: "Madew Rajawasan · Pexels",
    source: "https://www.pexels.com/photo/33012598/",
    license: "Pexels License",
  },
];
