-- Migration 003: Streak calculation trigger + helper functions
-- Runs automatically on every journal_entries INSERT

-- ──────────────────────────────────────────────────────────────────────────
-- Helper: calculate_user_streak
-- Recalculates current streak and longest streak for a given user
-- based on consecutive days with at least one journal entry.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current   INTEGER := 0;
  v_longest   INTEGER := 0;
  v_streak    INTEGER := 0;
  v_prev_date DATE;
  v_entry_date DATE;
BEGIN
  -- Walk entry dates in reverse chronological order
  FOR v_entry_date IN
    SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC')
    FROM   journal_entries
    WHERE  user_id = p_user_id
    ORDER  BY 1 DESC
  LOOP
    IF v_prev_date IS NULL THEN
      -- First row — always counts as streak of 1
      v_streak  := 1;
      v_current := 1;
    ELSIF v_prev_date - v_entry_date = 1 THEN
      -- Consecutive day
      v_streak  := v_streak + 1;
      -- Only extend current_streak while we're still on the leading edge
      IF v_current = v_streak - 1 THEN
        v_current := v_streak;
      END IF;
    ELSE
      -- Gap — streak broken. current is already set; keep going for longest.
      v_streak := 1;
    END IF;

    v_longest   := GREATEST(v_longest, v_streak);
    v_prev_date := v_entry_date;
  END LOOP;

  -- If the most recent entry is not from today or yesterday, streak is 0
  IF v_prev_date IS NOT NULL
     AND v_prev_date < CURRENT_DATE - INTERVAL '1 day' THEN
    v_current := 0;
  END IF;

  RETURN QUERY SELECT v_current, v_longest;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- Trigger function: update_streak_on_entry
-- Fires AFTER INSERT on journal_entries.
-- Updates users.current_streak and users.longest_streak.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_streak_on_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM calculate_user_streak(NEW.user_id);

  UPDATE users
  SET
    current_streak = r.current_streak,
    longest_streak = GREATEST(longest_streak, r.longest_streak),
    total_entries  = total_entries + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Attach trigger (idempotent via DROP IF EXISTS)
DROP TRIGGER IF EXISTS trg_update_streak ON journal_entries;
CREATE TRIGGER trg_update_streak
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_on_entry();

-- ──────────────────────────────────────────────────────────────────────────
-- Cron helper: reset_broken_streaks
-- Called daily at 00:05 UTC to zero-out streaks for users who missed
-- yesterday. Cron itself is scheduled in Supabase Dashboard or via
-- pg_cron extension.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reset_broken_streaks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Zero streak for any user whose last entry is older than yesterday
  UPDATE users u
  SET    current_streak = 0
  WHERE  u.current_streak > 0
    AND  NOT EXISTS (
           SELECT 1
           FROM   journal_entries e
           WHERE  e.user_id = u.id
             AND  DATE(e.created_at AT TIME ZONE 'UTC') >= CURRENT_DATE - 1
         );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- View: user_streak_stats
-- Convenience view for analytics / admin dashboard
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW user_streak_stats AS
SELECT
  u.id,
  u.email,
  u.current_streak,
  u.longest_streak,
  u.total_entries,
  (
    SELECT MAX(DATE(created_at AT TIME ZONE 'UTC'))
    FROM   journal_entries e
    WHERE  e.user_id = u.id
  ) AS last_entry_date
FROM users u;

-- Grants
GRANT EXECUTE ON FUNCTION calculate_user_streak(UUID)    TO service_role;
GRANT EXECUTE ON FUNCTION update_streak_on_entry()       TO service_role;
GRANT EXECUTE ON FUNCTION reset_broken_streaks()         TO service_role;
GRANT SELECT  ON user_streak_stats                       TO service_role;
