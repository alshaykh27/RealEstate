-- -----------------------------------------------------------------------------
-- Add a nullable land (plot) area to properties, in square metres, separate
-- from the built-up area (area_sqm). Shown on public cards/detail only when
-- set, and editable in the admin property form's details section.
--
-- Nullable: most listings (apartments, floors) have no plot of their own.
-- When set it must be >= 0 (NULL passes the check, matching area_sqm).
-- Safe to run once in the SQL Editor; re-running is a no-op.
-- -----------------------------------------------------------------------------
begin;

alter table public.properties
  add column if not exists land_area_sqm numeric(10, 2)
  constraint properties_land_area_sqm_check check (land_area_sqm >= 0);

commit;
