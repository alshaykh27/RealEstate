-- -----------------------------------------------------------------------------
-- Add a nullable "compound" name to properties.
--
-- Client requirement: visitors must be able to filter by compound name, since a
-- single area (e.g. Fifth Settlement) contains many compounds.
--
-- Both columns are nullable: not every property sits inside a named compound.
-- When present, English is the base and Arabic is optional (falls back to
-- English), matching the locked content model in docs/project-plan.md.
-- -----------------------------------------------------------------------------
begin;

alter table public.properties
  add column if not exists compound_en text,
  add column if not exists compound_ar text;

create index if not exists properties_compound_en_idx on public.properties (compound_en);

commit;
