-- ============================================================================
-- ECHO//SELF — Migration 002: Journal Entries
-- ============================================================================

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) >= 1),
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'voice', 'echo_session')),
  title TEXT,
  emotions JSONB DEFAULT '{}',
  ai_response TEXT,
  ai_processed BOOLEAN DEFAULT false,
  ai_processed_at TIMESTAMPTZ,
  processing_error TEXT,
  word_count INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN trim(content) = '' THEN 0
      ELSE array_length(regexp_split_to_array(trim(content), '\s+'), 1)
    END
  ) STORED,
  audio_url TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX journal_entries_user_created_idx
  ON journal_entries (user_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX journal_entries_ai_pending_idx
  ON journal_entries (user_id, created_at DESC)
  WHERE ai_processed = false AND is_deleted = false;

CREATE INDEX journal_entries_search_idx
  ON journal_entries USING gin (to_tsvector('english', content))
  WHERE is_deleted = false;

-- RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own journal"
  ON journal_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users insert own journal"
  ON journal_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users update own journal"
  ON journal_entries FOR UPDATE
  USING (user_id = auth.uid());

-- Soft delete only — users cannot hard-delete via client
-- (Hard delete via service role only, e.g. account deletion)

-- Auto-update updated_at
CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Increment profile total_entries counter
CREATE OR REPLACE FUNCTION increment_entry_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET
    total_entries = total_entries + 1,
    last_entry_date = CURRENT_DATE,
    current_streak = CASE
      WHEN last_entry_date = CURRENT_DATE THEN current_streak
      WHEN last_entry_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
      ELSE 1
    END,
    longest_streak = GREATEST(
      longest_streak,
      CASE
        WHEN last_entry_date = CURRENT_DATE THEN current_streak
        WHEN last_entry_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
        ELSE 1
      END
    )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_journal_entry_created
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  WHEN (NEW.content_type = 'text' OR NEW.content_type = 'voice')
  EXECUTE FUNCTION increment_entry_count();
