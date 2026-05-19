-- Daily digest table: compressed summaries of each day's journal entries
create table if not exists public.daily_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  digest_date date not null,
  summary text not null,
  entry_count int not null default 1,
  total_words int not null default 0,
  dominant_emotion text,
  avg_emotion_score float,
  source_entry_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, digest_date)
);

alter table public.daily_digests enable row level security;

create policy "users read own digests"
  on public.daily_digests for select
  using (auth.uid() = user_id);

create index on public.daily_digests (user_id, digest_date desc);

-- Schedule daily-digest edge function to run at 2am UTC every day
-- Requires pg_cron extension (enabled in Supabase Dashboard > Extensions)
select
  cron.schedule(
    'daily-digest-2am',
    '0 2 * * *',
    $$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_function_url') || '/daily-digest',
        headers := '{"Content-Type":"application/json","Authorization":"Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_anon_key') || '"}',
        body := '{}'::jsonb
      );
    $$
  );
