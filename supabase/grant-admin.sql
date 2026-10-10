-- =============================================================================
-- Darvia — grant the admin role to a user, by email
-- -----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor, AFTER:
--   1. running the Phase 3 migration
--        supabase/migrations/20261010123342_phase_3_schema.sql
--   2. creating the user in the dashboard
--        Authentication > Users > Add user (tick "Auto Confirm User")
--
-- It looks the user up in auth.users by email and sets public.profiles.is_admin.
-- EDIT THE EMAIL BELOW, then Run. Running it as postgres bypasses RLS on purpose.
-- =============================================================================

do $$
declare
  -- >>> EDIT THIS EMAIL (must match the address in Authentication > Users) <<<
  admin_email text := 'you@example.com';
  admin_id    uuid;
begin
  select id
    into admin_id
    from auth.users
   where lower(email) = lower(admin_email);

  if admin_id is null then
    raise exception
      'No auth.users row found for email "%". Create the user first (Authentication > Users > Add user, Auto Confirm), then re-run this script.',
      admin_email;
  end if;

  insert into public.profiles (id, is_admin)
  values (admin_id, true)
  on conflict (id) do update set is_admin = true;

  raise notice 'Admin role granted to % (%).', admin_email, admin_id;
end
$$;
