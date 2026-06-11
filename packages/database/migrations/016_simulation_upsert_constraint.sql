-- migration 016: Add UNIQUE constraint to future_self_simulations for upsert
-- This allows the simulation-batch service to upsert with ON CONFLICT DO UPDATE
-- instead of having to query first.
--
-- Also adds a match_memories() pgvector similarity function that the
-- memory-retrieve edge function uses, and a streak update function.

-- ── future_self_simulations unique constraint ──────────────────────────────

ALTER TABLE future_self_simulations
  ADD CONSTRAINT IF NOT EXISTS uq_simulation_user_horizon
  UNIQUE (user_id, horizon_months);

-- ── match_memories() — pgvector cosine similarity ──────────────────────────

CREATE OR REPLACE FUNCTION match_memories(
  query_embedding  vector(3072),
  match_threshold  float,
  match_count      int,
  p_user_id        uuid
)
RETURNS TABLE (
  id            uuid,
  content_chunk text,
  importance    float,
  similarity    float,
  created_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    id,
    content_chunk,
    importance,
    1 - (embedding <=> query_embedding) AS similarity,
    created_at
  FROM memories
  WHERE user_id = p_user_id
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── update_user_streak() ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_user_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_last_date  date;
  v_today      date := now()::date;
  v_yesterday  date := v_today - 1;
  v_streak     int;
  v_longest    int;
BEGIN
  SELECT current_streak, longest_streak
  INTO   v_streak, v_longest
  FROM   users
  WHERE  auth_id = p_user_id;

  -- Get the date of the most recent entry
  SELECT max(created_at)::date INTO v_last_date
  FROM   entries
  WHERE  user_id = p_user_id;

  IF v_last_date IS NULL THEN
    RETURN;
  END IF;

  IF v_last_date = v_today THEN
    -- Already journaled today — streak continues
    -- (only increment if last entry was yesterday, handled on INSERT trigger)
    NULL;
  ELSIF v_last_date = v_yesterday THEN
    v_streak := v_streak + 1;
  ELSE
    -- Gap > 1 day — reset streak
    v_streak := 1;
  END IF;

  v_longest := GREATEST(v_streak, COALESCE(v_longest, 0));

  UPDATE users
  SET current_streak = v_streak,
      longest_streak  = v_longest
  WHERE auth_id = p_user_id;
END;
$$;

-- ── Trigger: update streak after each new entry ───────────────────────────

CREATE OR REPLACE FUNCTION trg_update_streak()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM update_user_streak(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_entry_insert_streak ON entries;
CREATE TRIGGER after_entry_insert_streak
  AFTER INSERT ON entries
  FOR EACH ROW EXECUTE FUNCTION trg_update_streak();
