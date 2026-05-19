-- safety_events: audit log for emotional safety interventions
create table if not exists public.safety_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  risk_level      text not null check (risk_level in ('low','moderate','high','crisis')),
  trigger         text not null,
  content_snippet text,
  created_at      timestamptz not null default now()
);

-- Admin-only access — users cannot read their own safety events via API
-- (prevents circumventing detection by checking what triggers it)
alter table public.safety_events enable row level security;

create policy "service role only"
  on public.safety_events
  for all
  using (false);
