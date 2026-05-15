-- Migration 005: Analytics events table + growth intelligence views

-- ──────────────────────────────────────────────────────────────────────────
-- analytics_events — server-side event log
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name   TEXT        NOT NULL,
  properties   JSONB       NOT NULL DEFAULT '{}',
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_user_event
  ON analytics_events (user_id, event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_event_date
  ON analytics_events (event_name, occurred_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Service role can read/write; users cannot query their own event log directly
-- (use export-user-data endpoint for GDPR access)
CREATE POLICY "service_role_all" ON analytics_events
  FOR ALL TO service_role USING (true);

-- ──────────────────────────────────────────────────────────────────────────
-- View: daily_active_users
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW daily_active_users AS
SELECT
  DATE(occurred_at AT TIME ZONE 'UTC') AS date,
  COUNT(DISTINCT user_id)              AS dau
FROM analytics_events
WHERE event_name = 'entry_submitted'
GROUP BY 1
ORDER BY 1 DESC;

-- ──────────────────────────────────────────────────────────────────────────
-- View: onboarding_funnel
-- Tracks completion rate at each step
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW onboarding_funnel AS
SELECT
  'step_1_started'    AS step, COUNT(DISTINCT user_id) AS users FROM analytics_events WHERE event_name = 'onboarding_started'
UNION ALL
SELECT 'step_2_name',     COUNT(DISTINCT user_id) FROM analytics_events WHERE event_name = 'onboarding_step_2_completed'
UNION ALL
SELECT 'step_3_emotion',  COUNT(DISTINCT user_id) FROM analytics_events WHERE event_name = 'onboarding_step_3_completed'
UNION ALL
SELECT 'step_4_notif',    COUNT(DISTINCT user_id) FROM analytics_events WHERE event_name = 'onboarding_step_4_completed'
UNION ALL
SELECT 'step_5_paywall',  COUNT(DISTINCT user_id) FROM analytics_events WHERE event_name = 'onboarding_step_5_completed'
UNION ALL
SELECT 'completed',       COUNT(DISTINCT user_id) FROM analytics_events WHERE event_name = 'onboarding_completed';

-- ──────────────────────────────────────────────────────────────────────────
-- View: revenue_funnel
-- Paywall views → taps → conversions
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW revenue_funnel AS
SELECT
  COUNT(*) FILTER (WHERE event_name = 'paywall_viewed')          AS paywall_views,
  COUNT(*) FILTER (WHERE event_name = 'upgrade_tapped')          AS upgrade_taps,
  COUNT(*) FILTER (WHERE event_name = 'subscription_activated')  AS conversions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_name = 'subscription_activated')
    / NULLIF(COUNT(*) FILTER (WHERE event_name = 'paywall_viewed'), 0),
    2
  ) AS conversion_rate_pct
FROM analytics_events;

-- ──────────────────────────────────────────────────────────────────────────
-- View: streak_distribution
-- Distribution of current streak lengths (retention health signal)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW streak_distribution AS
SELECT
  CASE
    WHEN current_streak = 0       THEN '0 days'
    WHEN current_streak BETWEEN 1 AND 2   THEN '1-2 days'
    WHEN current_streak BETWEEN 3 AND 6   THEN '3-6 days'
    WHEN current_streak BETWEEN 7 AND 13  THEN '7-13 days'
    WHEN current_streak BETWEEN 14 AND 29 THEN '14-29 days'
    WHEN current_streak >= 30             THEN '30+ days'
  END AS bucket,
  COUNT(*) AS user_count,
  ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct
FROM users
GROUP BY 1
ORDER BY MIN(current_streak);

GRANT SELECT ON daily_active_users    TO service_role;
GRANT SELECT ON onboarding_funnel     TO service_role;
GRANT SELECT ON revenue_funnel        TO service_role;
GRANT SELECT ON streak_distribution   TO service_role;
