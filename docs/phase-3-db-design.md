# Darvia — Phase 3 Bilingual Database Design

Status: **APPROVED (with changes) — SQL delivered at `supabase/phase-3.sql` for review.**
Not run. Decisions recorded: English default/base; Arabic fully supported (RTL); cookie-based
locale; one shared slug per property; admin UI Arabic-only.

## Strategy

- **Column-per-locale** using `_en` / `_ar` suffixes (not JSONB) so Supabase row types, RLS, and
  queries stay simple, explicit, and indexable.
- **English is the base:** primary/label `*_en` columns are required. `*_ar` columns are nullable.
- **Language-neutral fields** carry no suffix and store one value valid for both locales.
- **Enum-like values** (property type, listing type, status) are stored as language-neutral codes;
  labels come from the UI dictionaries, never from the DB.
- **Fallback is per field, not per row** — see the SEO policy below.

## Arabic fallback & SEO policy

- Fallback for missing Arabic is **per field**: the Arabic value is used if non-empty, otherwise
  the English value is served.
- **Indexing is decided at the page level, not per field** (this is the improvement over a blanket
  "noindex on any fallback", which would deindex an entire Arabic page because one secondary field,
  e.g. `address_ar`, is missing):
  - **Partial fallback** (Arabic `title` and/or `description` present, only secondary fields fall
    back): `/ar` page stays **`index, follow`**, self-canonical, included in the sitemap.
  - **Full fallback** (both `title_ar` and `description_ar` missing → the `/ar` page is effectively
    English): the `/ar` page is **excluded from the sitemap** and marked **`robots: noindex, follow`**.
    No cross-locale `canonical` is set (avoiding contradictory signals).
- The decision is computed by one SEO helper from `title_ar` / `description_ar`, so the rule lives
  in a single place. `hreflang` still declares both locales normally.
- Array fields (e.g. `features`) fall back **as a whole**: an empty/null Arabic array uses English.
- Admin **warns** about missing Arabic but **never blocks publishing**.

## Tables

### `areas`

- **Translatable:** `name_en` (required), `name_ar`, `description_en` (required), `description_ar`
- **Neutral:** `id`, `slug` (shared), `sort_order`, `is_active`, `created_at`, `updated_at`

### `properties` (bilingual core)

- **Translatable** (`_en` required, `_ar` optional): `title`, `description`, `address`, `features`
  (array), `meta_title`, `meta_description`
- **Neutral:** `id`, `slug` (shared), `area_id` (FK), `created_by`; codes `property_type`,
  `listing_type`, `status`; numbers `price`, `currency`, `area_sqm`, `bedrooms`, `bathrooms`,
  `floor`, `year_built`, `latitude`, `longitude`; flags `is_published`, `is_featured`, `is_sample`;
  `created_at`, `updated_at`, `published_at`

### `property_slug_history`

- Keeps every previous slug so old URLs **301 redirect**.
- **Neutral:** `id`, `property_id` (FK), `old_slug` (unique), `created_at`.
- A trigger records the previous slug on change and refuses any slug that was ever used before.

### `property_images`

- **Translatable:** `alt_en` (defaults from the property's `title_en`), `alt_ar` (defaults from
  `title_ar`). A trigger fills blank values from the property title.
- **Neutral:** `id`, `property_id` (FK), `storage_path`, `width`, `height`, `size_bytes`,
  `is_cover`, `sort_order`, `created_at`.
- **Constraints:** max **20** photos per property (trigger); exactly **one cover** per property
  (partial unique index); `size_bytes` between 1 and **10 MiB**.
- **Storage:** one bucket `property-images` (public read) with the same 10 MiB limit and the
  allowed types `image/jpeg`, `image/png`, `image/webp`.

### `site_settings` (single row, explicit columns — not key/value)

- **Translatable:** `brand_name_en` / `brand_name_ar`, `hero_headline_en` / `hero_headline_ar`,
  `hero_subhead_en` / `hero_subhead_ar`, `about_en` / `about_ar`
- **Neutral:** `whatsapp_number`, `phone`, `email`, `facebook_url`, `logo_path`,
  `default_og_image`, `updated_at`
- Enforced single row via `check (id = 1)`.

### Admin users

- Handled by **Supabase Auth** (`auth.users`); `properties.created_by` references it.
  Language-neutral. No translated columns.

## Which fields stay language-neutral (summary)

- **Identifiers/keys:** `id`, `slug`, foreign keys, `storage_path`
- **Codes/enums:** `property_type`, `listing_type`, `status` (labels via dictionaries)
- **Numbers:** `price`, `currency`, `area_sqm`, `bedrooms`, `bathrooms`, `floor`, `year_built`,
  `latitude`, `longitude`
- **Flags:** `is_published`, `is_featured`, `is_sample`, `is_cover`, `is_active`
- **Timestamps:** `created_at`, `updated_at`, `published_at`
- **Contact handles:** `whatsapp_number`, `phone`, `email`, `facebook_url` (identical in both
  locales; wrap Latin runs in `<bdi dir="ltr">` in the Arabic UI)
- **Auth:** the entire `auth.users` surface

## Slug rules

- Generated **once** from the English title, stored in `properties.slug` (unique).
- **Editable manually only** — never auto-regenerated on later edits.
- On a change after publish, the previous slug is inserted into `property_slug_history`; the app
  looks it up and issues a **301** redirect to the current slug.
- A historical slug can never be reused.

## Media limits (from Phase 1 → DB/storage constraints)

- Max **20** photos per property (trigger `enforce_max_property_images`).
- Max **10 MiB** per file (`property_images.size_bytes` check + bucket `file_size_limit`).
- Allowed types `image/jpeg`, `image/png`, `image/webp` (bucket `allowed_mime_types`).
- ⚠️ **Confirm the exact Phase 1 numbers** (20 / 10 MiB / types) — they are taken as assumptions
  because the original spec text is not stored in the repo.

## RLS

- Public (anon) reads: `is_published and not is_sample` (images likewise). `areas`: `is_active`.
  `site_settings` and `property_slug_history`: public read.
- Writes: `authenticated` only (the single owner account). RLS acts on neutral columns only, so
  policies are identical for both locales.
- Storage: public read on the bucket; insert/update/delete require `authenticated`.

## Launch checklist

- [ ] **Remove all `is_sample` rows** (`properties`, `property_images`) and their storage objects
      before going live. RLS already hides them from the public site, but they must not ship.
- [ ] Replace placeholder storage paths and settings contact values with real ones.
- [ ] Confirm the media limits above match the Phase 1 spec.

## Open question

- None. (Admin UI language confirmed: Arabic-only, RTL.)
