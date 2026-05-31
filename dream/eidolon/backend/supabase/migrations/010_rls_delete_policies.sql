-- Migration 010: Add missing RLS DELETE policies
-- Every user-owned table must have an explicit DELETE policy.
-- Without it, _supabase.from('users').delete() in deleteAccount() is blocked
-- by RLS even though the auth.users ON DELETE CASCADE handles FK children.
--
-- Tables covered: users, eidolons, memories, runs, visits, guild_members,
--                 subscriptions, gacha_pulls, emotion_logs, reality_syncs

-- ── users ────────────────────────────────────────────────────────────────────
create policy "users_delete_own"
  on public.users for delete
  using (auth.uid() = auth_uid);

-- ── eidolons ──────────────────────────────────────────────────────────────────
create policy "eidolons_delete_own"
  on public.eidolons for delete
  using (
    user_id in (
      select id from public.users where auth_uid = auth.uid()
    )
  );

-- ── memories ──────────────────────────────────────────────────────────────────
create policy "memories_delete_own"
  on public.memories for delete
  using (
    eidolon_id in (
      select e.id from public.eidolons e
      join public.users u on u.id = e.user_id
      where u.auth_uid = auth.uid()
    )
  );

-- ── runs ──────────────────────────────────────────────────────────────────────
create policy "runs_delete_own"
  on public.runs for delete
  using (
    eidolon_id in (
      select e.id from public.eidolons e
      join public.users u on u.id = e.user_id
      where u.auth_uid = auth.uid()
    )
  );

-- ── visits ────────────────────────────────────────────────────────────────────
create policy "visits_delete_own"
  on public.visits for delete
  using (
    host_user_id in (select id from public.users where auth_uid = auth.uid())
  );

-- ── guild_members ─────────────────────────────────────────────────────────────
create policy "guild_members_delete_own"
  on public.guild_members for delete
  using (
    user_id in (select id from public.users where auth_uid = auth.uid())
  );

-- ── subscriptions ─────────────────────────────────────────────────────────────
create policy "subscriptions_delete_own"
  on public.subscriptions for delete
  using (
    user_id in (select id from public.users where auth_uid = auth.uid())
  );

-- ── gacha_pulls ───────────────────────────────────────────────────────────────
create policy "gacha_pulls_delete_own"
  on public.gacha_pulls for delete
  using (
    user_id in (select id from public.users where auth_uid = auth.uid())
  );

-- ── emotion_logs ──────────────────────────────────────────────────────────────
create policy "emotion_logs_delete_own"
  on public.emotion_logs for delete
  using (
    user_id in (select id from public.users where auth_uid = auth.uid())
  );

-- ── reality_syncs ─────────────────────────────────────────────────────────────
create policy "reality_syncs_delete_own"
  on public.reality_syncs for delete
  using (
    user_id in (select id from public.users where auth_uid = auth.uid())
  );
