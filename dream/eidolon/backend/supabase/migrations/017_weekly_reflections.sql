-- Migration 017: Weekly reflections — "what I noticed about you" (STRATEGY Act 2)
-- The Twin steps out of the dungeon and becomes a mirror: once a week it reflects
-- the user's real signals back to them — warm, specific, grounded. This is the
-- paid-tier relationship perk (STRATEGY §6) and touches identity directly, so it
-- obeys the Doctrines hardest (D5 grounded-only, D7 non-harm, D2 serve-not-supplant).
-- The prompt policy lives in _shared/reflection_prompt.ts; this is its storage +
-- weekly schedule. Mirrors 011_overnight_runs.

create table public.weekly_reflections (
  id          uuid primary key default gen_random_uuid(),
  eidolon_id  uuid not null references public.eidolons(id) on delete cascade,
  -- Denormalized for RLS without a join.
  user_id     uuid not null references public.users(id) on delete cascade,

  -- The Monday (UTC) the reflection covers. One reflection per Eidolon per week.
  week_start  date not null,

  reflection  text not null default '',  -- 2-4 warm sentences
  observation text not null default '',  -- one specific grounded thing noticed
  nudge       text not null default '',  -- optional gentle invitation (may be empty)

  ai_model    text,
  -- NULL until the player opens the reflection.
  seen_at     timestamptz,
  created_at  timestamptz not null default now(),

  unique (eidolon_id, week_start)
);

-- "Has an unseen reflection?" is the hot query — index it.
create index idx_weekly_reflections_user_unseen
  on public.weekly_reflections(user_id, week_start desc)
  where seen_at is null;

-- RLS: players read/update their own reflections; the service role (edge fn) writes.
alter table public.weekly_reflections enable row level security;

create policy "weekly_reflections_select_own"
  on public.weekly_reflections for select
  using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "weekly_reflections_update_own"
  on public.weekly_reflections for update
  using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "weekly_reflections_service_all"
  on public.weekly_reflections for all
  using (auth.role() = 'service_role');

-- ── Weekly schedule ──────────────────────────────────────────────────────────
-- Reuses the env-driven settings from 011 (app.settings.edge_base_url / cron_secret).
-- A single fan-out POST; the function processes only paid-tier Eidolons missing
-- this week's reflection. pg_net keeps it async (no long transaction).

create or replace function public.trigger_weekly_reflection()
returns void language plpgsql security definer as $$
declare
  base_url text := current_setting('app.settings.edge_base_url', true);
  secret   text := current_setting('app.settings.cron_secret', true);
begin
  if base_url is null or secret is null then
    raise notice 'weekly reflection skipped: app.settings.edge_base_url / cron_secret not configured';
    return;
  end if;

  perform net.http_post(
    url     := base_url || '/weekly-reflect',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret
    ),
    body    := jsonb_build_object('mode', 'cron')
  );
end;
$$;

-- Re-register idempotently. Monday 06:00 UTC — start of the week, after the night run.
select cron.unschedule('weekly-reflection')
  where exists (select 1 from cron.job where jobname = 'weekly-reflection');

select cron.schedule(
  'weekly-reflection',
  '0 6 * * 1',
  $$select public.trigger_weekly_reflection();$$
);
