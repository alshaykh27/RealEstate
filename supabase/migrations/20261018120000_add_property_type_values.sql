-- Option 1: extend the existing fixed property-type list (no admin-managed table).
-- public.property_type is a Postgres enum, so the type is extended in place.
-- Safe to run once in the Supabase SQL Editor, and re-running is harmless:
-- each statement only adds the value if it is missing, and the new values are
-- never used inside the same transaction (required by ALTER TYPE ADD VALUE).

alter type public.property_type add value if not exists 'twin_house';
alter type public.property_type add value if not exists 'quattro_villa';
alter type public.property_type add value if not exists 'family_house';
alter type public.property_type add value if not exists 'standalone_villa';
