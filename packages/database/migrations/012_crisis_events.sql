-- ── Crisis Events ─────────────────────────────────────────────────────────────
-- Records moments when the safety-check edge function detects crisis signals
-- in a user's journal entry. Used by the admin dashboard and support workflows.
--
-- Severity levels: critical | high | medium | low
-- crisis_events are write-once from the service role (edge function),
-- but can be marked resolved by admins.

CREATE TABLE IF NOT EXISTS crisis_events (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id       UUID        REFERENCES entries(id) ON DELETE SET NULL,
  severity       TEXT        NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  trigger_phrase TEXT,                      -- excerpt that triggered detection
  detected_tags  TEXT[]      NOT NULL DEFAULT '{}',
  response_sent  BOOLEAN     NOT NULL DEFAULT FALSE,  -- whether AI response was delivered
  resolved       BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_by    TEXT,                      -- admin email who resolved
  resolved_at    TIMESTAMPTZ,
  notes          TEXT,                      -- admin notes
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crisis_events_user_id    ON crisis_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crisis_events_severity   ON crisis_events (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS crisis_events_resolved   ON crisis_events (resolved, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert/update (edge functions use service key)
CREATE POLICY "Service role manages crisis events"
  ON crisis_events FOR ALL
  USING (auth.role() = 'service_role');

-- Users cannot read their own crisis events (privacy + avoid self-harm)
-- Admin reads via service_role client only.

-- ── Helper: upsert_crisis_event ───────────────────────────────────────────────
-- Called by the safety-check edge function. Idempotent on (user_id, entry_id, severity).

CREATE OR REPLACE FUNCTION upsert_crisis_event(
  p_user_id        UUID,
  p_entry_id       UUID,
  p_severity       TEXT,
  p_trigger_phrase TEXT DEFAULT NULL,
  p_detected_tags  TEXT[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO crisis_events (user_id, entry_id, severity, trigger_phrase, detected_tags)
  VALUES (p_user_id, p_entry_id, p_severity, p_trigger_phrase, p_detected_tags)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM crisis_events
    WHERE user_id = p_user_id
      AND entry_id = p_entry_id
      AND severity = p_severity
    LIMIT 1;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_crisis_event(UUID, UUID, TEXT, TEXT, TEXT[]) TO service_role;
