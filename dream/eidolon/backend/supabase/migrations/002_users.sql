-- Migration 002: Users table
-- Maps Supabase Auth UIDs to game player profiles

create table public.users (
  id            uuid primary key default gen_random_uuid(),
  auth_uid      uuid not null unique references auth.users(id) on delete cascade,
  username      text not null unique,
  display_name  text,
  avatar_url    text,
  timezone      text not null default 'UTC',
  language      text not null default 'en',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_active   timestamptz not null default now(),
  settings      jsonb not null default '{}'::jsonb,
  -- Reality sync consent flags
  health_sync_enabled   boolean not null default false,
  emotion_log_enabled   boolean not null default true
);

-- Username: lowercase, alphanumeric + underscore, 3-20 chars
alter table public.users
  add constraint username_format
    check (username ~ '^[a-z0-9_]{3,20}$');

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Indexes
create index idx_users_auth_uid    on public.users(auth_uid);
create index idx_users_last_active on public.users(last_active desc);

-- RLS
alter table public.users enable row level security;

create policy "users_select_own"
  on public.users for select
  using (auth.uid() = auth_uid);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = auth_uid)
  with check (auth.uid() = auth_uid);

create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = auth_uid);

-- Allow service role full access (Cloud Functions / Edge Functions)
create policy "users_service_all"
  on public.users for all
  using (auth.role() = 'service_role');
