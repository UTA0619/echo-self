-- Migration 011: Overnight autonomous runs ("while you sleep" engine)
-- The headline differentiator: each night the Eidolon adventures on its own.
-- A nightly pg_cron job invokes the `overnight-simulate` Edge Function, which
-- generates a narrative + rewards per Eidolon and writes one row here. The app
-- surfaces the unseen row as a "Morning Report".

create extension if not exists pg_cron;   -- scheduled jobs
create extension if not exists pg_net;    -- async HTTP from Postgres

create type public.overnight_status as enum ('pending', 'completed', 'failed');

create table public.overnight_runs (
  id          uuid primary key default gen_random_uuid(),
  eidolon_id  uuid not null references public.eidolons(id) on delete cascade,
  -- Denormalized for RLS + the nightly batch query (avoids a join per row).
  user_id     uuid not null references public.users(id) on delete cascade,

  -- The "night" this run represents. One run per Eidolon per date.
  run_date    date not null default current_date,
  status      public.overnight_status not null default 'completed',

  theme       text,                          -- dungeon theme explored
  narrative   text not null default '',      -- Claude-generated story of the night
  mood        public.eidolon_mood not null default 'calm',
  highlight   text not null default '',      -- one-line teaser for the home card
  xp_gained   integer not null default 0,
  loot        jsonb not null default '[]'::jsonb,  -- [{ "name": ..., "rarity": ... }]

  ai_model    text,
  -- NULL until the player opens the Morning Report.
  seen_at     timestamptz,
  created_at  timestamptz not null default now(),

  unique (eidolon_id, run_date)
);

-- "Has an unseen report?" is the hottest query — index it.
create index idx_overnight_runs_user_unseen
  on public.overnight_runs(user_id, run_date desc)
  where seen_at is null;

-- RLS: players read/update their own runs; the service role (Edge Function) writes.
alter table public.overnight_runs enable row level security;

create policy "overnight_runs_select_own"
  on public.overnight_runs for select
  using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "overnight_runs_update_own"
  on public.overnight_runs for update
  using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "overnight_runs_service_all"
  on public.overnight_runs for all
  using (auth.role() = 'service_role');

-- ── Nightly schedule ─────────────────────────────────────────────────────────
-- The Edge Function URL and a shared cron secret are environment-specific, so
-- they are read from database settings rather than hardcoded. Set them once per
-- environment (values live in Supabase, never in git):
--
--   alter database postgres set app.settings.edge_base_url = 'https://<ref>.supabase.co/functions/v1';
--   alter database postgres set app.settings.cron_secret   = '<random-shared-secret>';
--
-- The function fans out over all Eidolons missing tonight's run, so a single
-- fire-and-forget POST is enough; pg_net keeps it async (no long txn).

create or replace function public.trigger_overnight_simulation()
returns void language plpgsql security definer as $$
declare
  base_url text := current_setting('app.settings.edge_base_url', true);
  secret   text := current_setting('app.settings.cron_secret', true);
begin
  if base_url is null or secret is null then
    raise notice 'overnight simulation skipped: app.settings.edge_base_url / cron_secret not configured';
    return;
  end if;

  perform net.http_post(
    url     := base_url || '/overnight-simulate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret
    ),
    body    := jsonb_build_object('mode', 'cron')
  );
end;
$$;

-- Re-register idempotently (safe to re-run the migration).
select cron.unschedule('overnight-simulation')
  where exists (select 1 from cron.job where jobname = 'overnight-simulation');

-- 05:00 UTC daily — early morning across primary timezones.
select cron.schedule(
  'overnight-simulation',
  '0 5 * * *',
  $$select public.trigger_overnight_simulation();$$
);
