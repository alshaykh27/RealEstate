# Darvia — Phase 3 Bilingual Database Design

Status: **APPLIED & VERIFIED — migration run once on a fresh Supabase project (PostgreSQL 17.11).**
Decisions recorded: English default/base; Arabic fully supported (RTL); cookie-based
locale; one shared slug per property; admin UI Arabic-only.
Self-review (Phase 3 task) hardened the schema: admin-only writes via `public.profiles.is_admin`
(no longer "any authenticated user"), soft-delete via `properties.deleted_at`, storage/file cap
lowered to **3 MiB**, and a fixed `search_path` on the `security definer` admin helper.
Public read is `is_published and deleted_at is null`; `is_sample` no longer affects visibility.

## Files

- `supabase/migrations/20261010123342_phase_3_schema.sql` — the full schema (single source of truth),
  wrapped in `begin; … commit;`, run once on a **fresh** project via the SQL Editor.
- `supabase/migrations/20261012120000_add_property_compound.sql` — adds the nullable
  `compound_en` / `compound_ar` columns to `properties` (post-Phase-3 change; run via the SQL Editor).
- `supabase/migrations/20261012130000_add_promo_video_url.sql` — adds the nullable
  `site_settings.promo_video_url` column for the landing hero's optional external promo video
  (post-Phase-3 change; applied to the live project).
- `supabase/grant-admin.sql` — looks a user up in `auth.users` by **email** and grants
  `public.profiles.is_admin` (edit the email placeholder, then run).
- `scripts/verify-phase-3.mjs` (`npm run verify:phase3`) — REST + Storage checks with the **anon key
  only**; reads `.env.local`, never prints the keys.

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
- **Nullable translatable:** `compound_en` / `compound_ar` — both optional, because not every
  property sits inside a named compound. When present, English is the base and Arabic falls back to
  English. Added by `supabase/migrations/20261012120000_add_property_compound.sql`; powers the public
  compound filter. Filtering matches the language-neutral `compound_en` value, never translated text.
- **Neutral:** `id`, `slug` (shared), `area_id` (FK), `created_by`; codes `property_type`,
  `listing_type`, `status`; numbers `price`, `currency`, `area_sqm`, `land_area_sqm` (plot/land
  size, m², nullable, `>= 0`, added by `supabase/migrations/20261018150000_add_land_area_sqm.sql`),
  `bedrooms`, `bathrooms`, `floor`, `year_built`, `latitude`, `longitude`; flags `is_published`,
  `is_featured`, `is_sample`;
  `created_at`, `updated_at`, `published_at`, `deleted_at` (soft delete; public reads exclude
  non-null `deleted_at`). `is_sample` marks placeholder rows to remove before launch and **does not**
  affect public visibility (only `is_published` + `deleted_at` do).

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
  (partial unique index); `size_bytes` between 1 and **3 MiB**.
- **Storage:** one bucket `property-images` (public read) with the same **3 MiB** limit and the
  allowed types `image/jpeg`, `image/png`, `image/webp` (images are compressed client-side to WebP
  before upload).

### `site_settings` (single row, explicit columns — not key/value)

- **Translatable:** `brand_name_en` / `brand_name_ar`, `hero_headline_en` / `hero_headline_ar`,
  `hero_subhead_en` / `hero_subhead_ar`, `about_en` / `about_ar`
- **Neutral:** `whatsapp_number`, `phone`, `email`, `facebook_url`, `logo_path`,
  `default_og_image`, `promo_video_url`, `updated_at`
- `promo_video_url` (nullable) is the hero's optional promotional video — a YouTube or direct
  `.mp4`/`.webm` URL rendered client-side, never uploaded to Storage. Added by
  `supabase/migrations/20261012130000_add_promo_video_url.sql`.
- Enforced single row via `check (id = 1)`.

### `profiles` (admin role source of truth)

- One row per `auth.users` id (`id` FK → `auth.users`, `on delete cascade`).
- **Neutral:** `id`, `is_admin` (boolean, default `false`), `display_name`, `created_at`,
  `updated_at`.
- The owner's row has `is_admin = true`; every write policy checks `public.is_admin()`.
- **Anon cannot read this table at all.** A signed-in non-admin can only read/update their own
  row and cannot set `is_admin = true` on themselves (guarded by `with check … and not is_admin`).
- Bootstrapped by an INSERT run as `postgres` in the Supabase SQL editor (bypasses RLS) — see
  "Admin users" below. Never created from the app.

### Admin users

- Authentication handled by **Supabase Auth** (`auth.users`); `properties.created_by` references it.
- The **admin role is `public.profiles.is_admin`** (read through the `security definer`
  `public.is_admin()` helper with a fixed `search_path`). It is _not_ "any authenticated user".
- `profiles` is language-neutral. No translated columns.

## Which fields stay language-neutral (summary)

- **Identifiers/keys:** `id`, `slug`, foreign keys, `storage_path`
- **Codes/enums:** `property_type`, `listing_type`, `status` (labels via dictionaries)
- **Numbers:** `price`, `currency`, `area_sqm`, `land_area_sqm`, `bedrooms`, `bathrooms`, `floor`,
  `year_built`, `latitude`, `longitude`
- **Flags:** `is_published`, `is_featured`, `is_sample`, `is_cover`, `is_active`
- **Timestamps:** `created_at`, `updated_at`, `published_at`, `deleted_at`
- **Contact handles:** `whatsapp_number`, `phone`, `email`, `facebook_url` (identical in both
  locales; wrap Latin runs in `<bdi dir="ltr">` in the Arabic UI)
- **Auth:** the entire `auth.users` surface

## Slug rules

- Generated **once** from the English title, stored in `properties.slug` (unique).
- **Editable manually only** — never auto-regenerated on later edits.
- On a change after publish, the previous slug is inserted into `property_slug_history`; the app
  looks it up and issues a **301** redirect to the current slug.
- A historical slug can never be reused.

## Media limits (→ DB/storage constraints)

- Max **20** photos per property (trigger `enforce_max_property_images`).
- Max **3 MiB** per stored file (`property_images.size_bytes` check + bucket `file_size_limit`).
- Allowed types `image/jpeg`, `image/png`, `image/webp` (bucket `allowed_mime_types`).
- Photo count of **20** remains a Phase 1 assumption; the **3 MiB** stored-file cap is now fixed
  (client compresses to WebP before upload).

## RLS

- **Admin role:** `public.profiles.is_admin`, read via the `security definer` helper
  `public.is_admin()` (fixed `search_path = public, pg_temp`). All writes require an admin — never
  merely `authenticated`.
- Public (anon) reads: `is_published and deleted_at is null` (images likewise via their property).
  `areas`: `is_active`. `site_settings` and `property_slug_history`: public read. `profiles`: **no
  anon access**.
- RLS acts on neutral columns only, so policies are identical for both locales.
- Storage: public read on the bucket; insert/update/delete require an admin
  (`public.is_admin()`).

## Creating the admin user (do this yourself — never in chat)

1. Supabase dashboard → **Authentication → Users → Add user** → “Create new user”.
2. Enter the owner's **email** and a password, tick **Auto Confirm User**, save.
3. Run `supabase/grant-admin.sql` in the SQL editor after editing its email placeholder, e.g.:

   ```sql
   do $$
   declare
     admin_email text := 'you@example.com';   -- edit me
     admin_id uuid;
   begin
     select id into admin_id from auth.users where lower(email) = lower(admin_email);
     if admin_id is null then
       raise exception 'No auth.users row found for email "%". Create the user first.', admin_email;
     end if;
     insert into public.profiles (id, is_admin)
     values (admin_id, true)
     on conflict (id) do update set is_admin = true;
   end
   $$;
   ```

The script errors clearly if the user does not exist yet. The app never creates or promotes users;
`public.is_admin()` then returns `true` for that account.

## How it was tested

Applied to a fresh Supabase project (PostgreSQL 17.11) on 2026-10-10 using a one-off `pg` client
(run outside the repo) that executed the migration in a **single transaction**. The project was
confirmed empty first (no `public` tables, no buckets, no enums).

- **Migration:** applied in one `begin … commit`. Result: 6 tables, 3 enums, the `property-images`
  bucket (`file_size_limit = 3145728`, `allowed_mime_types = jpeg/png/webp`, public read) and 18
  policies; seed rows areas 6 / properties 4 / property_images 4 / site_settings 1 / profiles 0.
- **Admin:** the user was created in the dashboard (`auth.users`), then `supabase/grant-admin.sql`
  set `public.profiles.is_admin = true` (1 admin row).
- **Automated (anon key only):** `npm run verify:phase3` → **30 passed, 0 failed** — published reads
  succeed, the draft is hidden, anon INSERT/UPDATE/DELETE are rejected on all six tables,
  `profiles` and `inquiries` are not readable, and Storage rejects anonymous uploads.
- **Admin / limits (simulated in SQL, no password):** **9 passed, 0 failed** — bucket
  `file_size_limit = 3145728` and MIME list confirmed; simulated admin can insert `storage.objects`
  (RLS allows) while simulated non-admin and anon are denied (`42501`); `property_images.size_bytes`
  rejects `> 3145728` and `0` (SQLSTATE `23514`) and accepts exactly `3145728`.

## Known issues / limitations

- The **Storage-API-level** size/MIME rejection was not exercised end-to-end: anonymous uploads are
  blocked by RLS before the bucket limits apply, and an authenticated-admin upload needs a signed-in
  session (no password is used here). Instead the bucket's `file_size_limit` / `allowed_mime_types`
  were verified directly, and the equivalent 3 MiB cap was tested on `property_images.size_bytes`
  (DB check). Re-check the real upload path as a signed-in admin during Phase 5.
- The **constraints** (duplicate slug, second cover, 21st photo) can only be exercised by an admin
  insert, so they are not covered by the anon-only script.
- The migration uses `create type` / `create table` without `if not exists`, so it is intended for a
  **fresh** project and is not re-runnable as-is.

## Launch checklist

- [ ] **Remove all `is_sample` rows** (`properties`, `property_images`) and their storage objects
      before going live. `is_sample` does not hide rows; a published sample row is publicly visible,
      so samples must actually be deleted (not just flagged).
- [ ] Replace placeholder storage paths and settings contact values with real ones.
- [ ] Confirm the **20** photo cap matches the Phase 1 spec (the 3 MiB stored-file cap is fixed).

## Open question

- None. (Admin UI language confirmed: Arabic-only, RTL.)
