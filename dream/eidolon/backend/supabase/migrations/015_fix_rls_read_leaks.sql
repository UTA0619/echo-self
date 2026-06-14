-- Migration 015: close RLS read/write leaks
--
-- `eidolons_select_social` used `USING (true)`, which (because Postgres ORs
-- RLS policies together) exposed EVERY player's Eidolon to any authenticated
-- user — a privacy leak, and the cause of a broken first-run: the
-- "has this user onboarded?" check saw other users' Eidolons, routed brand-new
-- users past onboarding into Home, where their own (non-existent) Eidolon query
-- then failed. Social viewing will be reintroduced via a dedicated,
-- column-scoped view when that feature is actually built.
drop policy if exists "eidolons_select_social" on public.eidolons;

-- `crystal_receipts` was readable/writable by any authenticated user. It is only
-- ever touched by the credit_crystals() SECURITY DEFINER function, so lock it to
-- the service role.
drop policy if exists "crystal_receipts_service_all" on public.crystal_receipts;
create policy "crystal_receipts_service_all" on public.crystal_receipts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
