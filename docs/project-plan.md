# Darvia — Project Plan

Working plan and status. One phase at a time: build → verify → report → wait for approval.

## Product

Bilingual (Arabic + English) real-estate showcase + admin site for Egypt (New Cairo area).
Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase + Vercel, on free tiers only.

## Phases

| #   | Phase                                                             | Status                             |
| --- | ----------------------------------------------------------------- | ---------------------------------- |
| 1   | Design & requirements (`docs/phase-1-design.md`)                  | ✅ Approved                        |
| 2   | Project setup (Next 16 + TS + Tailwind v4 + Supabase clients)     | ✅ Verified                        |
| —   | **Scope change:** full bilingual ar + en from v1                  | 🔵 Foundation built (this step)    |
| 3   | Database schema + RLS + seed data (Supabase)                      | ✅ Applied & verified (2026-10-10) |
| 4   | Public site (home, listing+filters, detail, area, about, contact) | Pending                            |
| 5   | Admin (auth, CRUD, image upload, settings)                        | Pending                            |
| 6   | SEO/social, polish, Vercel deployment                             | Pending                            |

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
- **Media limits:** max 20 photos per property, max 3 MiB per stored image, types JPEG/PNG/WebP
  (client compresses to WebP before upload) — enforced in the DB and the storage bucket.
  ⚠️ The 20-photo count is still to be confirmed against Phase 1.
- **Admin role:** `public.profiles.is_admin` (checked via the `security definer` `public.is_admin()`
  helper). All writes require an admin; never "any authenticated user".
- **Launch cleanup:** all `is_sample` rows and their storage objects must be removed before launch
  (`is_sample` does not hide rows from the public site).
- **Admin:** unprefixed (`/admin/...`), excluded from the locale redirect. **Admin UI language:
  Arabic-only (RTL)**; the content-authoring fields remain bilingual (English base, Arabic optional).
- **Contact:** WhatsApp + Facebook only (no inquiry form). Contact brand colours are a scoped
  exception (see `docs/phase-1-design.md` §2).
- **Media:** photos only (no video).
- **Sample data:** flagged `is_sample` for pre-launch removal; not hidden by RLS.
- **i18n approach:** lightweight custom dictionaries (no `next-intl` dependency).

## Environment

`.env.local` (git-ignored) needs, from `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (metadata/OG base)

Phase 3 schema is the migration `supabase/migrations/20261010123342_phase_3_schema.sql` — applied once
on the fresh project. The admin role was granted with `supabase/grant-admin.sql`, and verification ran
with `npm run verify:phase3` (anon key only). Applying the migration used a one-off `SUPABASE_DB_URL`
(a Postgres connection string), since rotated and removed from `.env.local`; the app does **not** need it.

## Quality gates

`npm run lint` · `npm run format:check` · `npm run build` — all must pass before a phase is done.

## Open items / blockers

- **Phase 3 applied & verified** on 2026-10-10 (see `docs/phase-3-db-design.md` → "How it was tested").
- **Phase 4 (public site) implemented, verified, approved & pushed** on 2026-10-10: bilingual home,
  listings + filters, detail with similar-properties (cross-area fallback, clearly area-labeled),
  areas index/detail, about, contact, localized 404s, real data layer via anon Supabase reads.
- ~~Rotate the database password and remove `SUPABASE_DB_URL` from `.env.local`.~~ **Done** (rotated;
  `SUPABASE_DB_URL` removed — the app uses only the public env vars).
- ~~Dependency gap.~~ **Fixed:** `@supabase/ssr`, `@supabase/supabase-js`, `clsx` and `tailwind-merge`
  were undeclared; all four are now pinned in `dependencies`. A clean `npm install` + `npm run build`
  was verified from an emptied `node_modules`.
- The 20-photo cap is still a Phase 1 assumption to confirm.

## Phase 5 carry-over (must do — do not let slip)

- [ ] Re-check the **Storage-API** 3 MiB size limit and MIME allow-list with a **signed-in admin
      upload** end-to-end. In Phase 3 these were only verified at the bucket-config + DB-check level
      (anonymous uploads are RLS-blocked before the limits apply). See `docs/phase-3-db-design.md`
      → "Known issues / limitations".
- [ ] Confirm the real photo-upload path compresses to WebP client-side and enforces the 20-photo cap.
- [ ] Replace the seed placeholder rows and their fake storage paths with **real images** before any
      launch — published `is_sample` rows are publicly visible and currently render the branded
      placeholder (Phase 3 design doc → Launch checklist).
