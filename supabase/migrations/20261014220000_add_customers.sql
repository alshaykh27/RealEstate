-- =============================================================================
-- Darvia — customers (admin lead book)
-- -----------------------------------------------------------------------------
-- A simple internal log of people who contacted the agency: name, phone,
-- freeform notes on what they're interested in, and when they were logged
-- (created_at). Admin-only end to end — no public policy at all, so anon and
-- any non-admin signed-in user get zero rows (RLS defaults to deny with no
-- matching policy), matching the `profiles` table's approach.
-- =============================================================================
begin;

create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null,
  notes      text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_created_idx on public.customers (created_at desc);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

create policy customers_admin_all on public.customers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;
