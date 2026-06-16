-- Migration 016: allow authenticated users to write their own dungeon runs and
-- gacha pulls.
--
-- Both `runs` (005) and `gacha_pulls` (007) shipped with only *_select_own and
-- *_service_all policies. The mobile/web client writes both tables directly
-- (dungeon startRun/advanceRoom/finishRun; gacha pull), so every
-- "ダンジョンに入る" and every ×1/×10 召喚 failed with:
--   new row violates row-level security policy for table "runs" / "gacha_pulls"
-- (in the gacha case the crystals were already deducted by the SECURITY DEFINER
--  deduct_crystals RPC, so the pull silently burned crystals with no record).
--
-- Add INSERT (and, for runs, UPDATE) policies scoped to rows owned by the
-- caller, mirroring the existing *_select_own ownership subqueries. RLS still
-- blocks writing rows for another user's Eidolon/account.

create policy "runs_insert_own"
  on public.runs for insert
  with check (
    eidolon_id in (
      select e.id from public.eidolons e
      join public.users u on u.id = e.user_id
      where u.auth_uid = auth.uid()
    )
  );

create policy "runs_update_own"
  on public.runs for update
  using (
    eidolon_id in (
      select e.id from public.eidolons e
      join public.users u on u.id = e.user_id
      where u.auth_uid = auth.uid()
    )
  )
  with check (
    eidolon_id in (
      select e.id from public.eidolons e
      join public.users u on u.id = e.user_id
      where u.auth_uid = auth.uid()
    )
  );

-- gacha_pulls: let users record their own pulls (user_id references users.id).
create policy "gacha_pulls_insert_own"
  on public.gacha_pulls for insert
  with check (
    user_id in (select id from public.users where auth_uid = auth.uid())
  );
