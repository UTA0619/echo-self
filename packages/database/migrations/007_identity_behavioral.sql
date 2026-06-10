-- ── IDENTITY NODES ────────────────────────────────────────────────────────────
-- Persistent belief/value/fear/pattern nodes extracted from journal entries
-- by the identity-infer edge function.

CREATE TABLE IF NOT EXISTS identity_nodes (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL CHECK (type IN (
                              'belief', 'value', 'core_fear', 'core_desire',
                              'behavioral_pattern', 'relationship_pattern', 'strength'
                            )),
  label         TEXT        NOT NULL,
  description   TEXT,
  evidence      TEXT[]      NOT NULL DEFAULT '{}',
  confidence    FLOAT       NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  polarity      TEXT        NOT NULL DEFAULT 'neutral'
                              CHECK (polarity IN ('positive', 'negative', 'neutral')),
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  evidence_count INTEGER    NOT NULL DEFAULT 1,
  first_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS identity_nodes_user_active
  ON identity_nodes (user_id, active, confidence DESC);

CREATE INDEX IF NOT EXISTS identity_nodes_user_type
  ON identity_nodes (user_id, type);

-- ── BEHAVIORAL PATTERNS ───────────────────────────────────────────────────────
-- Recurring behavioral patterns detected by the pattern-detect edge function.

CREATE TABLE IF NOT EXISTS behavioral_patterns (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_type         TEXT        NOT NULL,
  pattern_description  TEXT        NOT NULL,
  frequency_days       INTEGER     NOT NULL DEFAULT 7,
  confidence           FLOAT       NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  trigger_tags         TEXT[]      NOT NULL DEFAULT '{}',
  evidence_entry_ids   UUID[]      NOT NULL DEFAULT '{}',
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS behavioral_patterns_user_active
  ON behavioral_patterns (user_id, is_active, confidence DESC);

-- ── BEHAVIORAL TAGS (per-entry) ───────────────────────────────────────────────
-- Raw tag rows extracted per entry by the behavioral-tag edge function.

CREATE TABLE IF NOT EXISTS entry_behavioral_tags (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id       UUID        NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tags           TEXT[]      NOT NULL DEFAULT '{}',
  dominant_theme TEXT,
  growth_indicators TEXT[]   NOT NULL DEFAULT '{}',
  risk_indicators   TEXT[]   NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entry_id)
);

CREATE INDEX IF NOT EXISTS entry_behavioral_tags_user
  ON entry_behavioral_tags (user_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE identity_nodes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_patterns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_behavioral_tags  ENABLE ROW LEVEL SECURITY;

-- identity_nodes
CREATE POLICY "Users can view their identity nodes"
  ON identity_nodes FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Service role manages identity nodes"
  ON identity_nodes FOR ALL USING (auth.role() = 'service_role');

-- behavioral_patterns
CREATE POLICY "Users can view their behavioral patterns"
  ON behavioral_patterns FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Service role manages behavioral patterns"
  ON behavioral_patterns FOR ALL USING (auth.role() = 'service_role');

-- entry_behavioral_tags
CREATE POLICY "Users can view their entry tags"
  ON entry_behavioral_tags FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Service role manages entry tags"
  ON entry_behavioral_tags FOR ALL USING (auth.role() = 'service_role');

-- ── updated_at TRIGGERS ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER identity_nodes_updated_at
  BEFORE UPDATE ON identity_nodes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER behavioral_patterns_updated_at
  BEFORE UPDATE ON behavioral_patterns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
