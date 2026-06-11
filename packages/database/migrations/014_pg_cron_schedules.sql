-- ── pg_cron schedules ─────────────────────────────────────────────────────────
-- Supabase supports pg_cron via the pg_cron extension.
-- These schedules invoke Supabase Edge Functions via net.http_post.
--
-- NOTE: pg_net (net.http_post) must be enabled in the Supabase dashboard first.
-- All edge function calls are protected by the CRON_SECRET env var.
--
-- To verify:  SELECT * FROM cron.job;
-- To cancel:  SELECT cron.unschedule('job-name');

-- ── Enable extensions (idempotent) ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Helper: project edge function base URL ────────────────────────────────────
-- Stored in Supabase vault; fall back to a placeholder if vault not configured.
-- In production, set this via: SELECT vault.create_secret('...', 'echo_functions_url');

-- ── 1. Daily insight push notification ────────────────────────────────────────
-- Fires every day at 09:00 UTC → generate-daily-insight edge function
SELECT cron.schedule(
  'echo-daily-insight',           -- job name (unique)
  '0 9 * * *',                    -- cron expression: 9am UTC daily
  $$
    SELECT net.http_post(
      url     := current_setting('app.functions_url', true) || '/generate-daily-insight',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      ),
      body    := '{}'::jsonb
    )
  $$
);

-- ── 2. Nightly future-self simulation batch ───────────────────────────────────
-- Fires every day at 03:00 UTC → update-future-self edge function
SELECT cron.schedule(
  'echo-future-self-batch',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.functions_url', true) || '/update-future-self',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      ),
      body    := '{}'::jsonb
    )
  $$
);

-- ── 3. Pattern detection (weekly, Sunday 02:00 UTC) ───────────────────────────
SELECT cron.schedule(
  'echo-pattern-detect',
  '0 2 * * 0',
  $$
    SELECT net.http_post(
      url     := current_setting('app.functions_url', true) || '/pattern-detect',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      ),
      body    := '{}'::jsonb
    )
  $$
);

-- ── Set GUC variables for edge function base URL and cron secret ─────────────
-- IMPORTANT: Set these in Supabase dashboard → Settings → Database → Extensions
-- Or run manually in the SQL editor:
--
--   ALTER DATABASE postgres SET app.functions_url = 'https://<project-ref>.supabase.co/functions/v1';
--   ALTER DATABASE postgres SET app.cron_secret   = '<your-cron-secret>';
--
-- These are not stored in this migration to avoid committing secrets.
