-- =============================================================================
-- Darvia — Phase 3 migration: schema, constraints, indexes, RLS, storage, seed
-- -----------------------------------------------------------------------------
-- Apply ONCE on a FRESH Supabase project. Two ways:
--   1. SQL Editor: paste this whole file and Run (it is wrapped in begin/commit).
--   2. Supabase CLI: `supabase db push` (the CLI runs each migration inside its
--      own transaction; the begin/commit below then becomes a harmless nested
--      pair — use the SQL Editor path if you want exactly one transaction).
--
-- Locale model: English is the base (required); Arabic (_ar) columns are optional
-- and fall back to English in the application layer. One shared slug per property.
--
-- MEDIA LIMITS (storage keeps these hard, unchanged by the client):
--   * maximum 20 photos per property
--   * maximum 3 MiB (3145728 bytes) per stored image file
--   * allowed image types: image/jpeg, image/png, image/webp
--     (images are compressed client-side to WebP before upload)
-- The same numbers are enforced on property_images.size_bytes and on the
-- Supabase Storage bucket. Storage writes are admin-only (see public.is_admin()).
--
-- is_sample marks placeholder rows to remove before launch. It does NOT affect
-- visibility: public read is governed solely by is_published + deleted_at (null).
-- Remove every is_sample row and its storage objects before launch
-- (see docs/project-plan.md launch checklist).
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enum types (stored as codes; human labels live in the UI dictionaries)
-- -----------------------------------------------------------------------------
create type public.property_type as enum (
  'apartment', 'villa', 'townhouse', 'duplex', 'penthouse', 'studio',
  'chalet', 'office', 'shop', 'land'
);
create type public.listing_type as enum ('sale', 'rent');
create type public.property_status as enum ('available', 'sold', 'rented');

-- -----------------------------------------------------------------------------
-- Shared trigger helper: keep updated_at current
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
--   One row per authenticated user. The owner's row carries is_admin = true,
--   which is what every write policy checks. Anon cannot read this table at all;
--   a signed-in non-admin can only read/update their own row and can never set
--   is_admin = true for themselves (see the with-check clauses below).
--   The owner is bootstrapped by an INSERT run in the Supabase SQL editor (as
--   the postgres role, which bypasses RLS), never from the app.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  is_admin     boolean not null default false,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Admin check used by every write policy. SECURITY DEFINER so it can read
-- public.profiles regardless of the caller's RLS, with a fixed search_path.
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin
  );
$$;

-- -----------------------------------------------------------------------------
-- areas
-- -----------------------------------------------------------------------------
create table public.areas (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name_en        text not null,
  name_ar        text,
  description_en text not null,
  description_ar text,
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index areas_active_sort_idx on public.areas (is_active, sort_order);

create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- properties
--   slug: generated ONCE from the English title by the application, then edited
--   manually only. Never regenerated automatically. Historical slugs are kept in
--   property_slug_history for 301 redirects.
-- -----------------------------------------------------------------------------
create table public.properties (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  area_id             uuid references public.areas (id) on delete set null,
  created_by          uuid default auth.uid() references auth.users (id) on delete set null,

  property_type       public.property_type not null,
  listing_type        public.listing_type not null,
  status              public.property_status not null default 'available',

  title_en            text not null,
  title_ar            text,
  description_en      text not null,
  description_ar      text,
  address_en          text not null,
  address_ar          text,
  features_en         text[] not null default '{}',
  features_ar         text[],
  meta_title_en       text,
  meta_title_ar       text,
  meta_description_en text,
  meta_description_ar text,

  price               numeric(14, 2) not null check (price >= 0),
  currency            text not null default 'EGP',
  area_sqm            numeric(10, 2) check (area_sqm >= 0),
  bedrooms            integer check (bedrooms >= 0),
  bathrooms           integer check (bathrooms >= 0),
  floor               integer,
  year_built          integer check (year_built between 1900 and 2100),
  latitude            double precision check (latitude between -90 and 90),
  longitude           double precision check (longitude between -180 and 180),

  is_published        boolean not null default false,
  is_featured         boolean not null default false,
  is_sample           boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  published_at        timestamptz,
  deleted_at          timestamptz
);

create index properties_area_idx       on public.properties (area_id);
create index properties_type_idx       on public.properties (property_type);
create index properties_listing_idx    on public.properties (listing_type);
create index properties_status_idx     on public.properties (status);
create index properties_price_idx      on public.properties (price);
create index properties_created_idx    on public.properties (created_at desc);
create index properties_public_idx     on public.properties (is_published, is_sample, deleted_at);
create index properties_features_en_idx on public.properties using gin (features_en);

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- property_slug_history — old slugs, kept forever, used for 301 redirects
-- -----------------------------------------------------------------------------
create table public.property_slug_history (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  old_slug    text not null unique,
  created_at  timestamptz not null default now()
);

create index property_slug_history_property_idx on public.property_slug_history (property_id);

-- When a slug changes: record the previous slug and refuse any slug ever used before.
create function public.handle_property_slug_change()
returns trigger
language plpgsql
as $$
begin
  if new.slug is distinct from old.slug then
    if exists (
      select 1 from public.property_slug_history where old_slug = new.slug
    ) then
      raise exception 'Slug "%" was used previously; choose a different slug.', new.slug;
    end if;

    insert into public.property_slug_history (property_id, old_slug)
    values (old.id, old.slug)
    on conflict (old_slug) do nothing;
  end if;
  return new;
end;
$$;

create trigger properties_slug_history
  before update of slug on public.properties
  for each row execute function public.handle_property_slug_change();

-- -----------------------------------------------------------------------------
-- property_images
--   alt_en defaults from the property's title_en; alt_ar falls back to title_ar.
--   Max 20 rows per property; exactly one cover per property.
-- -----------------------------------------------------------------------------
create table public.property_images (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties (id) on delete cascade,
  storage_path text not null,
  alt_en       text not null,
  alt_ar       text,
  width        integer check (width > 0),
  height       integer check (height > 0),
  size_bytes   bigint not null check (size_bytes > 0 and size_bytes <= 3145728),
  is_cover     boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index property_images_property_idx on public.property_images (property_id, sort_order);
create unique index property_images_path_idx on public.property_images (property_id, storage_path);
create unique index property_images_one_cover_idx
  on public.property_images (property_id)
  where is_cover;

-- Enforce the per-property photo cap.
create function public.enforce_max_property_images()
returns trigger
language plpgsql
as $$
declare
  cnt integer;
begin
  select count(*) into cnt from public.property_images where property_id = new.property_id;
  if cnt >= 20 then
    raise exception 'Photo limit reached: a property may have at most 20 photos.';
  end if;
  return new;
end;
$$;

create trigger property_images_max_count
  before insert on public.property_images
  for each row execute function public.enforce_max_property_images();

-- Default alt text from the property title when a blank value is supplied.
create function public.fill_image_alt_from_title()
returns trigger
language plpgsql
as $$
begin
  if new.alt_en is null or btrim(new.alt_en) = '' then
    select title_en into new.alt_en from public.properties where id = new.property_id;
  end if;
  if new.alt_ar is null or btrim(new.alt_ar) = '' then
    select title_ar into new.alt_ar from public.properties where id = new.property_id;
  end if;
  return new;
end;
$$;

create trigger property_images_alt_default
  before insert or update on public.property_images
  for each row execute function public.fill_image_alt_from_title();

-- -----------------------------------------------------------------------------
-- site_settings — SINGLE row (id = 1) with explicit columns (not key/value)
-- -----------------------------------------------------------------------------
create table public.site_settings (
  id               integer primary key default 1,
  brand_name_en    text not null,
  brand_name_ar    text,
  hero_headline_en text not null,
  hero_headline_ar text,
  hero_subhead_en  text not null,
  hero_subhead_ar  text,
  about_en         text,
  about_ar         text,
  whatsapp_number  text,
  phone            text,
  email            text,
  facebook_url     text,
  logo_path        text,
  default_og_image text,
  updated_at       timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Row Level Security
--   Public (anon) reads see published, non-deleted rows only.
--   Every write is restricted to an admin (public.is_admin(), i.e. a profiles
--   row with is_admin = true) — never merely "any authenticated user".
--   profiles is not readable by anon at all. RLS acts on language-neutral
--   columns; localization happens after the fetch.
-- =============================================================================
alter table public.areas                 enable row level security;
alter table public.properties            enable row level security;
alter table public.property_images       enable row level security;
alter table public.property_slug_history enable row level security;
alter table public.profiles              enable row level security;
alter table public.site_settings         enable row level security;

-- profiles
--   Anon: no policy -> denied. A signed-in non-admin may create/read/update
--   only their own row and can never flip is_admin to true (with-check guards).
--   Admins may read and manage every profile. The owner is seeded via the SQL
--   editor as postgres (bypasses RLS), not through these policies.
create policy profiles_read_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid() and not is_admin);
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and not is_admin);
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- areas
create policy areas_public_read on public.areas
  for select using (is_active);
create policy areas_admin_all on public.areas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- properties
create policy properties_public_read on public.properties
  for select using (is_published and deleted_at is null);
create policy properties_admin_all on public.properties
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- property_images (public sees images of published, non-deleted properties)
create policy property_images_public_read on public.property_images
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_images.property_id
        and p.is_published
        and p.deleted_at is null
    )
  );
create policy property_images_admin_all on public.property_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- property_slug_history (public read so anonymous 301 redirects resolve)
create policy slug_history_public_read on public.property_slug_history
  for select using (true);
create policy slug_history_admin_all on public.property_slug_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- site_settings
create policy site_settings_public_read on public.site_settings
  for select using (true);
create policy site_settings_admin_all on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Supabase Storage: one public-read bucket with the same limits
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage: public read; insert/update/delete admin-only.
create policy property_images_storage_public_read on storage.objects
  for select using (bucket_id = 'property-images');
create policy property_images_storage_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'property-images' and public.is_admin());
create policy property_images_storage_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'property-images' and public.is_admin())
  with check (bucket_id = 'property-images' and public.is_admin());
create policy property_images_storage_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'property-images' and public.is_admin());

-- =============================================================================
-- Seed data — idempotent; every listing is flagged is_sample = true
-- (storage files are placeholders and must be replaced or deleted before launch)
-- =============================================================================

-- Areas (the six launch areas)
insert into public.areas (id, slug, name_en, name_ar, description_en, description_ar, sort_order)
values
  ('00000000-0000-4000-a000-000000000001', 'fifth-settlement', 'Fifth Settlement', 'التجمع الخامس', 'The heart of New Cairo.', 'قلب القاهرة الجديدة.', 1),
  ('00000000-0000-4000-a000-000000000002', 'new-cairo', 'New Cairo', 'القاهرة الجديدة', 'A modern, expanding district.', 'منطقة حديثة ومتوسعة.', 2),
  ('00000000-0000-4000-a000-000000000003', 'beit-al-watan', 'Beit Al Watan', 'بيت الوطن', 'Residential plots and villas.', 'قطع سكنية وفيلات.', 3),
  ('00000000-0000-4000-a000-000000000004', 'new-administrative-capital', 'New Administrative Capital', 'العاصمة الإدارية الجديدة', 'Egypt''s new administrative hub.', 'العاصمة الإدارية الجديدة.', 4),
  ('00000000-0000-4000-a000-000000000005', 'madinaty', 'Madinaty', 'مدينتي', 'Integrated gated community.', 'مجتمع سكني متكامل.', 5),
  ('00000000-0000-4000-a000-000000000006', 'al-rehab', 'Al Rehab', 'الرحاب', 'Established gated city.', 'مدينة سكنية قائمة.', 6)
on conflict (id) do nothing;

-- Site settings (singleton)
insert into public.site_settings (
  id, brand_name_en, brand_name_ar, hero_headline_en, hero_headline_ar,
  hero_subhead_en, hero_subhead_ar, about_en, about_ar,
  whatsapp_number, phone, email, facebook_url
)
values (
  1,
  'Darvia', 'دارفيا',
  'Find Your Next Address', 'عقارك القادم يبدأ من هنا',
  'Explore premium properties for sale and rent in New Cairo, Fifth Settlement and beyond.',
  'استعرض عقارات مميزة للبيع والإيجار في القاهرة الجديدة والتجمع الخامس وما حولها.',
  'Darvia is a real-estate showcase for the New Cairo area.',
  'دارفيا منصة لعرض العقارات في منطقة القاهرة الجديدة.',
  '+201000000000', '+20220000000', 'info@example.com', 'https://facebook.com/example'
)
on conflict (id) do nothing;

-- Sample properties
insert into public.properties (
  id, slug, area_id, property_type, listing_type, status,
  title_en, title_ar, description_en, description_ar,
  address_en, address_ar, features_en, features_ar,
  price, area_sqm, bedrooms, bathrooms, floor, year_built,
  is_published, is_featured, is_sample
)
values
  (
    '00000000-0000-4000-b000-000000000001', 'sample-modern-villa-fifth-settlement',
    '00000000-0000-4000-a000-000000000001', 'villa', 'sale', 'available',
    'Modern Villa in Fifth Settlement', 'فيلا حديثة في التجمع الخامس',
    'A bright modern villa with a private garden.', 'فيلا حديثة مشرقة بحديقة خاصة.',
    'Fifth Settlement, New Cairo', 'التجمع الخامس، القاهرة الجديدة',
    array['Private garden', 'Garage', 'Central A/C'],
    array['حديقة خاصة', 'جراج', 'تكييف مركزي'],
    12000000, 350, 5, 4, 0, 2021, true, true, true
  ),
  (
    '00000000-0000-4000-b000-000000000002', 'sample-apartment-madinaty',
    '00000000-0000-4000-a000-000000000005', 'apartment', 'rent', 'available',
    'Furnished Apartment in Madinaty', 'شقة مفروشة في مدينتي',
    'Fully furnished apartment close to the club.', 'شقة مفروشة بالكامل بالقرب من الكلوب.',
    'Madinaty, New Cairo', 'مدينتي، القاهرة الجديدة',
    array['Furnished', 'Gym access', 'Security'],
    array['مفروشة', 'صالة رياضية', 'أمن'],
    45000, 140, 3, 2, 3, 2019, true, false, true
  ),
  (
    '00000000-0000-4000-b000-000000000003', 'sample-townhouse-al-rehab',
    '00000000-0000-4000-a000-000000000006', 'townhouse', 'sale', 'available',
    'Townhouse in Al Rehab', 'تاون هاوس في الرحاب',
    'Family townhouse with a rooftop terrace.', 'تاون هاوس عائلي بتراس على السطح.',
    'Al Rehab, New Cairo', 'الرحاب، القاهرة الجديدة',
    array['Rooftop terrace', 'Two parking spots'],
    array['تراس على السطح', 'موقفان للسيارات'],
    8500000, 260, 4, 3, 0, 2016, true, false, true
  ),
  -- A deliberately UNPUBLISHED sample (draft), so the verification script can
  -- prove that drafts are not publicly readable.
  (
    '00000000-0000-4000-b000-000000000004', 'sample-draft-unpublished',
    '00000000-0000-4000-a000-000000000002', 'apartment', 'sale', 'available',
    'Draft Apartment (unpublished)', 'شقة مسودة (غير منشورة)',
    'This row is is_published = false and must never be public.',
    'هذا الصف غير منشور ولا يجب أن يظهر للعامة.',
    'New Cairo', 'القاهرة الجديدة',
    array['Draft only'],
    array['مسودة فقط'],
    1000, 100, 2, 1, 1, 2020, false, false, true
  )
on conflict (id) do nothing;

-- Sample images (blank alt_* are auto-filled from the property title by trigger)
insert into public.property_images (
  property_id, storage_path, alt_en, alt_ar, width, height, size_bytes, is_cover, sort_order
)
values
  ('00000000-0000-4000-b000-000000000001', 'sample/villa-1.jpg', '', null, 1600, 1067, 1048576, true, 0),
  ('00000000-0000-4000-b000-000000000001', 'sample/villa-2.jpg', '', '', 1600, 1067, 1048576, false, 1),
  ('00000000-0000-4000-b000-000000000002', 'sample/apartment-1.jpg', '', '', 1600, 1067, 1048576, true, 0),
  ('00000000-0000-4000-b000-000000000003', 'sample/townhouse-1.jpg', '', null, 1600, 1067, 1048576, true, 0)
on conflict (property_id, storage_path) do nothing;

commit;
