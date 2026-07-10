-- Migration 013: Consent ledger (Doctrine D4 — Granular, Revocable Consent)
-- Every reality signal (steps, sleep, HRV, emotion) and every social capability
-- (visit, trade, duel, memory exchange) is opt-in PER ITEM and revocable. The
-- server reads these grants before folding any reality data into the overnight
-- simulation (see backend/supabase/functions/_shared/consent.ts).
--
-- Default DENY: the absence of a granted row means "not consented" (Doctrine D8,
-- minimization). Revocation is auditable via an append-only event log so a player
-- can always see when a consent changed (Doctrine D10, transparency).
--
-- See: docs/governance/CONSTITUTION.md (D4/D8/D10), docs/governance/phases/PHASE_A.md (A-1)

-- ── enumerable signals (kept in sync with consent.ts CONSENT_SIGNALS) ──────────
create type public.consent_signal as enum (
  'steps',
  'sleep',
  'hrv',
  'emotion',
  'social_visit',
  'social_trade',
  'social_duel',
  'memory_exchange'
);

-- ── current state: one row per (user, signal) ─────────────────────────────────
create table public.consent_grants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  signal      public.consent_signal not null,
  -- Default false: a freshly-created row is still DENY until explicitly granted.
  granted     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, signal)
);

create index idx_consent_grants_user on public.consent_grants(user_id);

-- ── append-only audit: every grant/revoke is recorded, never mutated ──────────
create table public.consent_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  signal      public.consent_signal not null,
  granted     boolean not null,          -- the value AFTER this change
  changed_at  timestamptz not null default now()
);

create index idx_consent_events_user on public.consent_events(user_id, changed_at desc);

-- Bump updated_at and write an audit row whenever a grant's value changes (or is
-- first inserted). Keeps the ledger and its history consistent at the DB layer so
-- no application path can revoke without leaving a trace (D4 acceptance criterion).
create or replace function public.log_consent_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') or (new.granted is distinct from old.granted) then
    new.updated_at := now();
    insert into public.consent_events(user_id, signal, granted)
    values (new.user_id, new.signal, new.granted);
  end if;
  return new;
end;
$$;

create trigger trg_consent_grants_audit
  before insert or update on public.consent_grants
  for each row execute function public.log_consent_change();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.consent_grants enable row level security;
alter table public.consent_events enable row level security;

-- Players fully manage their own grants (grant, revoke, and erase for D1/D9).
create policy "consent_grants_select_own"
  on public.consent_grants for select
  using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "consent_grants_insert_own"
  on public.consent_grants for insert
  with check (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "consent_grants_update_own"
  on public.consent_grants for update
  using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "consent_grants_delete_own"
  on public.consent_grants for delete
  using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "consent_grants_service_all"
  on public.consent_grants for all
  using (auth.role() = 'service_role');

-- Audit log: players may READ their own history; only the trigger (service) writes.
-- Deletion is permitted solely so account erasure (D1/D9) can fully remove history.
create policy "consent_events_select_own"
  on public.consent_events for select
  using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "consent_events_delete_own"
  on public.consent_events for delete
  using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy "consent_events_service_all"
  on public.consent_events for all
  using (auth.role() = 'service_role');
