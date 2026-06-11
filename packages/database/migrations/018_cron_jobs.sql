-- migration 018: pg_cron scheduled jobs for ECHO edge functions
--
-- Schedules the following recurring jobs:
--   1. generate-daily-insight  — 9am UTC daily
--   2. pattern-detect batch    — 2am UTC daily (after overnight journaling)
--   3. update-future-self      — 3am UTC daily (light workload)
--
-- pg_cron uses cron syntax: minute hour day month weekday
-- Edge functions are invoked via the net.http_post extension.
--
-- IMPORTANT: Replace SUPABASE_URL and CRON_SECRET with actual values
-- when running in production via `supabase secrets set`.
--
-- These jobs use the internal Supabase URL to avoid external network hops.

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the net (pg_net) extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 1. Daily Insight push notification ──────────────────────────────────────
-- Runs at 9:00 UTC daily. Sends personalized memory-based insights to all
-- eligible users with Expo push tokens.

SELECT cron.schedule(
  'daily-insight-push',         -- job name (unique)
  '0 9 * * *',                  -- 9:00 UTC every day
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/generate-daily-insight',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-cron-secret',   current_setting('app.cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ── 2. Pattern detect — nightly behavioral analysis ──────────────────────────
-- Runs at 2:00 UTC daily. Detects recurring behavioral patterns for all
-- active users who have journaled in the last 30 days.
-- Calls pattern-detect once per user via a loop in the edge function itself.

SELECT cron.schedule(
  'pattern-detect-nightly',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/pattern-detect',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-cron-secret',   current_setting('app.cron_secret')
    ),
    body    := jsonb_build_object('batch', true)
  );
  $$
);

-- ── 3. Future-self simulation batch ──────────────────────────────────────────
-- Runs at 3:00 UTC daily (after pattern-detect finishes).
-- The simulation-batch service handles this via its own scheduler,
-- but this cron can trigger it via the internal batch endpoint.
-- NOTE: For production, prefer ECS/Fly.io scheduled tasks for the Node.js
-- simulation-batch service. This is a fallback trigger.

SELECT cron.schedule(
  'future-self-simulation-nightly',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/update-future-self',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-cron-secret',   current_setting('app.cron_secret')
    ),
    body    := jsonb_build_object('batch', true, 'limit', 50)
  );
  $$
);

-- ── 4. Streak maintenance ────────────────────────────────────────────────────
-- Runs at midnight UTC. Resets current_streak for users who missed a day.
-- Uses the update_user_streak() function defined in migration 016.

SELECT cron.schedule(
  'streak-maintenance-midnight',
  '5 0 * * *',
  $$
  SELECT update_user_streak(id)
  FROM users
  WHERE deleted_at IS NULL
    AND last_entry_date < CURRENT_DATE - INTERVAL '1 day'
    AND current_streak > 0;
  $$
);

-- ── Verify cron jobs ─────────────────────────────────────────────────────────
-- After running this migration, verify with:
-- SELECT * FROM cron.job;

-- Store required config values (set via supabase secrets in production)
-- These are set as GUC parameters so cron jobs can read them.
-- In production: supabase secrets set CRON_SECRET=...
-- Then set via: ALTER DATABASE postgres SET app.cron_secret = '...';
COMMENT ON SCHEMA cron IS 'pg_cron job definitions. Jobs fire against the local Supabase instance.';
