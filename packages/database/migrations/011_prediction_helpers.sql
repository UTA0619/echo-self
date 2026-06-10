-- ── get_users_for_prediction ──────────────────────────────────────────────────
-- Returns user IDs eligible for nightly future-self prediction generation.
-- Criteria: premium user, ≥ 20 memory chunks, not deleted.
-- Called by the update-future-self cron edge function.

CREATE OR REPLACE FUNCTION get_users_for_prediction()
RETURNS TABLE (user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id AS user_id
  FROM users u
  WHERE u.deleted_at IS NULL
    AND u.subscription_tier = 'premium'
    AND (
      SELECT COUNT(*)
      FROM memories m
      WHERE m.user_id = u.id
    ) >= 20
  ORDER BY u.last_entry_date DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_users_for_prediction() TO service_role;

-- ── get_active_users_for_notifications ────────────────────────────────────────
-- Users who haven't journaled today and have push tokens.
-- Used by the ai-push-notifications cron function.

CREATE OR REPLACE FUNCTION get_active_users_for_notifications(p_today DATE)
RETURNS TABLE (
  user_id      UUID,
  display_name TEXT,
  push_tokens  TEXT[],
  streak       INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.display_name,
    ARRAY_AGG(pt.expo_push_token) AS push_tokens,
    u.current_streak
  FROM users u
  JOIN push_tokens pt ON pt.user_id = u.id
  WHERE u.deleted_at IS NULL
    AND (u.last_entry_date IS NULL OR u.last_entry_date < p_today)
  GROUP BY u.id, u.display_name, u.current_streak
  HAVING COUNT(pt.expo_push_token) > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_users_for_notifications(DATE) TO service_role;

-- ── Emotion history helper view ───────────────────────────────────────────────
-- Materialises a per-user, per-day dominant emotion for the last 30 days.
-- Used by the daily-digest and future-self edge functions.

CREATE OR REPLACE VIEW emotion_history_7d AS
SELECT
  e.user_id,
  DATE(e.created_at) AS date,
  MODE() WITHIN GROUP (ORDER BY e.emotion) AS dominant_emotion,
  AVG(CASE WHEN e.emotion IN ('joy', 'trust', 'anticipation', 'optimism', 'love') THEN 1
           WHEN e.emotion IN ('sadness', 'fear', 'anger', 'disgust') THEN -1
           ELSE 0 END) AS avg_valence
FROM entries e
WHERE e.created_at >= NOW() - INTERVAL '7 days'
  AND e.emotion IS NOT NULL
GROUP BY e.user_id, DATE(e.created_at);

GRANT SELECT ON emotion_history_7d TO service_role;
GRANT SELECT ON emotion_history_7d TO authenticated;
