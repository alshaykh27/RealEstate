# Darvia — Project Plan

Working plan and status. One phase at a time: build → verify → report → wait for approval.

## Product

Bilingual (Arabic + English) real-estate showcase + admin site for Egypt (New Cairo area).
Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase + Vercel, on free tiers only.

## Phases

| #   | Phase                                                             | Status                                |
| --- | ----------------------------------------------------------------- | ------------------------------------- |
| 1   | Design & requirements (`docs/phase-1-design.md`)                  | ✅ Approved                           |
| 2   | Project setup (Next 16 + TS + Tailwind v4 + Supabase clients)     | ✅ Verified                           |
| —   | **Scope change:** full bilingual ar + en from v1                  | 🔵 Foundation built (this step)       |
| 3   | Database schema + RLS + seed data (Supabase)                      | 🟡 SQL delivered for review (not run) |
| 4   | Public site (home, listing+filters, detail, area, about, contact) | Pending                               |
| 5   | Admin (auth, CRUD, image upload, settings)                        | Pending                               |
| 6   | SEO/social, polish, Vercel deployment                             | Pending                               |

## Locked decisions

- **Locales:** `ar` + `en`, sub-path routing (`/ar/...`, `/en/...`). Config in `src/i18n/config.ts`.
- **English is the default locale.** First visit with no cookie → English (root `/` redirects).
  The foundation as built is accepted as-is; this default does not change.
- **Cookie-based locale selection:** the active locale is stored in the `NEXT_LOCALE` cookie
  (set by the proxy and updated when the user switches); the choice persists across visits.
- **Arabic is fully supported (RTL):** `/ar` renders `dir="rtl"`, and Arabic content is
  editable in the admin. Direction is locale-driven (`rtl` for `/ar`, `ltr` for `/en`).
- **Slugs:** one shared slug per property across locales (the same URL segment for `/ar` and `/en`).
- **Content model:** **English is the base** (required); Arabic is fully supported and optional
  on a per-field basis. Missing Arabic falls back to English. (Supersedes the earlier
  "AR required, EN optional" rule — see `docs/phase-3-db-design.md`.)
- **Arabic fallback & SEO:** fallback is per field; indexing is decided **per page**. A `/ar` page
  with partial fallback stays `index, follow`; a page whose Arabic title _and_ description are both
  missing is `noindex, follow` and excluded from the sitemap. Admin warns about missing Arabic but
  never blocks publishing.
- **Slug history:** slugs are generated once from the English title and edited manually only;
  every previous slug is kept in `property_slug_history` for 301 redirects and cannot be reused.
- **Media limits:** max 20 photos per property, max 10 MiB per image, types JPEG/PNG/WebP — enforced
  in the DB and the storage bucket. ⚠️ Exact Phase 1 numbers to be confirmed.
- **Launch cleanup:** all `is_sample` rows and their storage objects must be removed before launch.
- **Admin:** unprefixed (`/admin/...`), excluded from the locale redirect. **Admin UI language:
  Arabic-only (RTL)**; the content-authoring fields remain bilingual (English base, Arabic optional).
- **Contact:** WhatsApp + Facebook only (no inquiry form). Contact brand colours are a scoped
  exception (see `docs/phase-1-design.md` §2).
- **Media:** photos only (no video).
- **Sample data:** flagged `is_sample`, shown only in admin, never presented as genuine.
- **i18n approach:** lightweight custom dictionaries (no `next-intl` dependency).

## Environment

`.env.local` (git-ignored) needs, from `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (metadata/OG base)

Phase 3 SQL lives at `supabase/phase-3.sql` — review only; it is not run automatically.

## Quality gates

`npm run lint` · `npm run format:check` · `npm run build` — all must pass before a phase is done.

## Open items / blockers

- **Phase 3 blocked:** needs a live Supabase project (URL + anon key). No local Supabase is
  possible here (no Docker / Supabase CLI / psql). DDL + RLS + seed also need a way to run SQL
  (dashboard SQL editor, or `SUPABASE_DB_URL`/service role for migrations).
