# Darvia — Project Conventions (Phase 2)

Established during Phase 2 (project setup). Update this doc when conventions change.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Supabase + Vercel (free tiers).
Routing lives under `src/app`. This is Next 16 — read its bundled docs in
`node_modules/next/dist/docs/` before writing code; several APIs changed.

## Folder structure

```
src/
  app/[locale]/     localized routes (page/layout/loading/error per phase)
  components/
    ui/             small presentational primitives (buttons, badges, inputs)
    layout/         header, footer, navigation, language switcher, WhatsApp FAB
    properties/     property cards, gallery, filters, detail sections
    admin/          admin dashboard screens (phase 5+)
  i18n/             locale config + dictionaries + getDictionary()
  lib/
    supabase/       supabase clients (browser + server)
    seo.ts          localeAlternates() — canonical + hreflang
    utils.ts        cn() helper (clsx + tailwind-merge)
  types/            shared TS types (database row types generated from Supabase)
  proxy.ts          locale detection + redirect (Next 16 renamed middleware → proxy)
supabase/
  migrations/       versioned SQL migrations (single source of truth for the schema)
  grant-admin.sql   edit-email helper to grant public.profiles.is_admin
scripts/
  verify-phase-3.mjs  anon-key REST/Storage verification (npm run verify:phase3)
docs/               phase documents (this one, phase-1-design.md, project-plan.md)
```

## Routing & internationalization

- Locales `ar` + `en` are configured in `src/i18n/config.ts` (single source of truth).
- **English is the default locale**; Arabic is fully supported (RTL). Every route is
  locale-prefixed: `/ar/...` and `/en/...`; there is **no** unprefixed route. `src/proxy.ts`
  (Next 16 renamed `middleware` → `proxy`) redirects unprefixed requests to a locale and
  **records the choice in the `NEXT_LOCALE` cookie** (cookie-based locale selection). First
  visit with no cookie → **English** (`defaultLocale`).
- `src/app/[locale]/layout.tsx` is the root layout: it sets `<html lang dir>` from the
  locale (`dirFor`) and its `generateStaticParams` prerenders every locale.
- Copy lives in `src/i18n/dictionaries/{ar,en}.ts` behind `getDictionary(locale)`; both
  dictionaries share the `Dictionary` type (derived from `en.ts`) so missing keys fail the
  build. No user-facing text hardcoded into logic or conditions.
- **Content model:** English is the base (required); Arabic is fully supported and optional
  per field. Missing Arabic falls back to English. Use **one shared slug per property** across
  locales — the same URL segment for `/ar` and `/en`.
- **Admin UI is Arabic-only (RTL)** and unprefixed (`/admin/...`, excluded from the locale
  redirect); content-authoring fields remain bilingual regardless.
- SEO: each page returns `localeAlternates(locale, path)` (canonical + `hreflang` map +
  `x-default` = English). The language switcher preserves the current path when switching.

- Route-specific components may be colocated in `app/**/_components/` (private folder).
- Empty scaffolding folders are not created ahead of the phase that uses them.

## Data access rules

- **Public reads** — server components query with the anon client/reserved role; RLS
  restricts results to published, non-deleted rows (`is_published and deleted_at is null`).
- **Admin writes** — server-only. Auth is always re-checked server-side; never trust the
  client. Supabase `service_role` key must NEVER appear in browser code or `NEXT_PUBLIC_*`.
- Reads of private data must never be exposed through public queries.

## Content, SEO & media rules

- **Locale fallback:** English is the base (required); Arabic is optional per field and falls back
  to English. Both are stored in the DB; the app resolves the value for the active locale.
- **SEO indexing is per page, not per field:** partial Arabic fallback → `/ar` stays `index,
follow`; a page missing **both** the Arabic title and description → `noindex, follow` and omitted
  from the sitemap. Admin warns but never blocks publishing.
- **Slugs:** generated once from the English title, edited manually only. Previous slugs live in
  `property_slug_history` and 301-redirect; a historical slug is never reused.
- **Media limits:** max **20** photos per property, max **3 MiB** per stored image, types
  JPEG/PNG/WebP (client compresses to WebP before upload) — enforced in the DB, the Supabase Storage
  bucket, and the upload UI. ⚠️ confirm the 20-photo count against Phase 1.
- **Admin writes:** every write requires an admin — `public.profiles.is_admin` via the
  `security definer` `public.is_admin()` helper. Never "any authenticated user". Later: `/admin` UI.
- **Soft delete:** `properties.deleted_at`; public reads exclude non-null `deleted_at`.
- **Alt text:** defaults to the property title; still overridable per image and per locale.
- **Sample data:** every placeholder row is `is_sample`. It marks rows for **removal before launch**
  and does **not** hide them (public read is governed by `is_published` + `deleted_at`). Remove all
  sample rows + files before launch.

## Environment variables

- `.env.local` — real local values, git-ignored, never committed.
- `.env.example` — committed template of every required variable.
- `NEXT_PUBLIC_*` — inlined into the browser bundle at build time. Only non-secret values.
- Everything else is server-only.

## Styling

- The colour system is defined as Tailwind v4 `@theme` tokens in `src/app/globals.css`
  (`bg-obsidian`, `text-gold`, `text-ink`, `bg-surface-cream`, `text-info`, …). That file is the
  single source of truth — **no raw hex in components**. Reusable button/badge classes
  (`.btn-*`, `.badge-*`) live in the same file. See `docs/phase-1-design.md` §2 for the full list.
- Fonts are self-hosted via `next/font` in `src/app/[locale]/layout.tsx`:
  `--font-display` (Tajawal) / `--font-body` (IBM Plex Sans Arabic) / `--font-latin` (Inter).
  `globals.css` selects them per locale — Arabic uses Tajawal (headings) + IBM Plex Sans
  Arabic (body), English uses Inter. Use `font-heading` for headings, `font-sans` for body.
- **RTL/LTR:** direction is locale-driven. `src/app/[locale]/layout.tsx` sets
  `dir="rtl" lang="ar"` for Arabic and `dir="ltr" lang="en"` for English. Use logical
  properties (`ps/pe`, `ms/me`, `text-start/end`, `start/end`) — never hardcoded
  `left`/`right`. In Arabic, wrap Latin runs (prices, phones, URLs) in `<bdi dir="ltr">`.
- Dark sections add the `.on-dark` class so the focus ring switches to gold automatically.
- Accessibility: focus rings visible everywhere, ≥44px tap targets, alt text on images,
  status never conveyed by colour alone, WCAG contrast checked for text/icon/interactive pairs.

## Quality gates

- `npm run lint` — ESLint (Next core-web-vitals + TS configs).
- `npm run format` / `npm run format:check` — Prettier (incl. Tailwind class sorting).
- `npm run build` — production build must pass before a phase is considered done.

## General rules

- Server components by default; add `"use client"` only when needed.
- Bilingual (Arabic + English): English is the default/base; Arabic is fully supported. English
  content is required, Arabic is optional per field and falls back to English. No locale-specific
  copy hardcoded into logic/conditions.
- Do not add libraries speculatively; keep the dependency set minimal.
- Sample/placeholder data must be flagged `is_sample` and removed before launch (it is not hidden by
  RLS).
