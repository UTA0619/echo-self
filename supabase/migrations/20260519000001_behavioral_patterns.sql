-- behavioral_patterns: stores detected recurring behavioral patterns per user
create table if not exists public.behavioral_patterns (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  pattern_type        text not null check (pattern_type in ('cognitive','emotional','relational','energy','temporal')),
  pattern_description text not null,
  frequency_days      int,
  confidence          float not null default 0.6 check (confidence between 0 and 1),
  trigger_tags        text[] default '{}',
  evidence_entry_ids  uuid[] default '{}',
  first_detected_at   timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  is_active           boolean not null default true
);

create index on public.behavioral_patterns (user_id, is_active, last_seen_at desc);

alter table public.behavioral_patterns enable row level security;

create policy "users own their behavioral patterns"
  on public.behavioral_patterns
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- future_self_simulations: stores AI-generated future self narratives + letters
create table if not exists public.future_self_simulations (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  horizon_months          int not null,
  persona_name            text,
  description             text,
  key_trait_shifts        jsonb default '[]',
  letter_text             text,
  trajectory_score        float check (trajectory_score between 0 and 10),
  confidence              float check (confidence between 0 and 1),
  context_entry_count     int default 0,
  created_at              timestamptz not null default now(),
  snapshot_identity       jsonb default '{}',
  snapshot_behaviors      jsonb default '{}'
);

create index on public.future_self_simulations (user_id, created_at desc);

alter table public.future_self_simulations enable row level security;

create policy "users own their future self simulations"
  on public.future_self_simulations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Schedule pattern-detect cron to run daily at 3am UTC (after daily-digest at 2am).
-- pg_cron is production-only (enabled via the Supabase Dashboard); guard on the
-- cron schema so this migration still applies in local/CI Postgres.
do $do$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule(
      'pattern-detect-daily',
      '0 3 * * *',
      $cron$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_FUNCTIONS_URL') || '/pattern-detect',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  end if;
end
$do$;
