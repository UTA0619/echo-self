# Database Schema — ECHO//SELF

**Database:** PostgreSQL 15 via Supabase  
**Extensions:** `vector`, `uuid-ossp`, `pg_trgm`, `pgcrypto`

---

## Schema Overview

```
auth.users (Supabase managed)
    │
    ├── profiles (1:1)
    ├── journal_entries (1:N)
    │       └── emotion_logs (1:N)
    ├── memories (1:N)
    │       └── memory_embeddings (1:1)
    ├── identity_nodes (1:N)
    │       └── identity_edges (M:N)
    ├── future_self_predictions (1:N)
    ├── echo_sessions (1:N)
    │       └── echo_messages (1:N)
    ├── insights (1:N)
    ├── subscriptions (1:1)
    ├── referrals (1:N)
    └── notification_preferences (1:1)
```

---

## Tables

### `profiles`

Extended user data beyond what Supabase Auth provides.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_data JSONB DEFAULT '{}',
  -- onboarding_data: { emotion: string, goal: string, step_completed: number }
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_entry_date DATE,
  total_entries INTEGER DEFAULT 0,
  total_echo_sessions INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE DEFAULT LEFT(MD5(gen_random_uuid()::TEXT), 8),
  referred_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their profile"
  ON profiles USING (id = auth.uid());

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### `journal_entries`

Core content table. Every user input lives here.

```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'voice', 'echo_session')),
  title TEXT,  -- auto-generated or user-set
  emotions JSONB DEFAULT '{}',
  -- emotions: { primary: { emotion, intensity }, secondary: [...], valence: float, arousal: float, themes: [], trigger_signals: [] }
  ai_response TEXT,  -- "How does this land?" response
  ai_processed BOOLEAN DEFAULT false,
  ai_processed_at TIMESTAMPTZ,
  processing_error TEXT,
  word_count INTEGER GENERATED ALWAYS AS (
    array_length(regexp_split_to_array(trim(content), '\s+'), 1)
  ) STORED,
  audio_url TEXT,  -- Supabase Storage URL for voice entries
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX journal_entries_user_created_idx
  ON journal_entries (user_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX journal_entries_search_idx
  ON journal_entries USING gin (to_tsvector('english', content))
  WHERE is_deleted = false;

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their journal"
  ON journal_entries USING (user_id = auth.uid());
```

---

### `memories`

AI-extracted atomic facts about the user, embedded for semantic search.

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(3072),  -- text-embedding-3-large
  type TEXT NOT NULL CHECK (type IN (
    'value', 'core_fear', 'core_desire', 'belief',
    'behavioral_pattern', 'relationship_pattern', 'strength', 'event'
  )),
  emotion TEXT,
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  tags TEXT[] DEFAULT '{}',
  source_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  reinforcement_count INTEGER DEFAULT 1,
  last_reinforced_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false,  -- user-flagged as no longer true
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANN search index (IVFFlat)
-- Tune `lists` based on row count: sqrt(n_rows) is a good heuristic
CREATE INDEX memories_embedding_idx
  ON memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Composite index for user-scoped time-sorted queries
CREATE INDEX memories_user_created_idx
  ON memories (user_id, created_at DESC)
  WHERE is_archived = false;

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their memories"
  ON memories USING (user_id = auth.uid());

-- Semantic search function
CREATE OR REPLACE FUNCTION retrieve_memories(
  p_user_id UUID,
  p_query_embedding VECTOR(3072),
  p_top_k INTEGER DEFAULT 10,
  p_min_similarity FLOAT DEFAULT 0.75,
  p_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID, content TEXT, type TEXT, emotion TEXT,
  confidence FLOAT, similarity FLOAT, created_at TIMESTAMPTZ
) LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT id, content, type, emotion, confidence,
    1 - (embedding <=> p_query_embedding) AS similarity,
    created_at
  FROM memories
  WHERE user_id = p_user_id
    AND is_archived = false
    AND (p_types IS NULL OR type = ANY(p_types))
    AND 1 - (embedding <=> p_query_embedding) >= p_min_similarity
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_top_k;
$$;
```

---

### `identity_nodes`

The identity graph nodes extracted from memory patterns.

```sql
CREATE TABLE identity_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'value', 'core_fear', 'core_desire', 'strength',
    'behavioral_pattern', 'limiting_belief', 'relationship_pattern'
  )),
  label TEXT NOT NULL,
  description TEXT,
  evidence TEXT[] DEFAULT '{}',
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  polarity TEXT DEFAULT 'neutral' CHECK (polarity IN ('positive', 'negative', 'neutral')),
  active BOOLEAN DEFAULT true,
  user_challenged BOOLEAN DEFAULT false,  -- user flagged this as outdated
  challenged_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX identity_nodes_user_idx ON identity_nodes (user_id, confidence DESC)
  WHERE active = true;

ALTER TABLE identity_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their identity"
  ON identity_nodes USING (user_id = auth.uid());
```

---

### `future_self_predictions`

AI-generated trajectory predictions.

```sql
CREATE TABLE future_self_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('30d', '90d', '365d')),
  headline TEXT NOT NULL,
  narrative TEXT NOT NULL,
  opportunity TEXT,
  risk TEXT,
  confidence FLOAT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Each user has one active prediction per timeframe
  CONSTRAINT unique_active_prediction UNIQUE (user_id, timeframe)
);

ALTER TABLE future_self_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their predictions"
  ON future_self_predictions USING (user_id = auth.uid());
```

---

### `echo_sessions`

Echo session metadata and conversation storage.

```sql
CREATE TABLE echo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT,  -- auto-detected session theme
  session_insight TEXT,  -- end-of-session 1-sentence insight
  memory_context_ids UUID[],  -- which memories were used in context
  message_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES journal_entries(id)  -- linked entry
);

CREATE TABLE echo_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES echo_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX echo_messages_session_idx ON echo_messages (session_id, created_at ASC);

ALTER TABLE echo_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their sessions"
  ON echo_sessions USING (user_id = auth.uid());

ALTER TABLE echo_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their messages"
  ON echo_messages USING (user_id = auth.uid());
```

---

### `subscriptions`

Stripe subscription state, synced via webhook.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused'
  )),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  -- Usage counters (reset monthly)
  entries_this_month INTEGER DEFAULT 0,
  echo_sessions_this_month INTEGER DEFAULT 0,
  usage_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view their subscription"
  ON subscriptions FOR SELECT USING (user_id = auth.uid());
-- Service role manages subscription writes (webhook handler)
```

---

### `referrals`

Viral referral tracking.

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_id UUID NOT NULL REFERENCES auth.users(id),
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rewarded')),
  converted_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  reward_type TEXT,  -- 'free_month', 'discount'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view their referrals"
  ON referrals FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());
```

---

### `notification_preferences`

User notification settings.

```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onesignal_player_id TEXT,
  streak_reminders BOOLEAN DEFAULT true,
  insight_ready BOOLEAN DEFAULT true,
  future_self_checkin BOOLEAN DEFAULT true,
  re_engagement BOOLEAN DEFAULT true,
  preferred_send_hour INTEGER CHECK (preferred_send_hour >= 0 AND preferred_send_hour <= 23),
  -- learned from open patterns
  optimal_send_hour INTEGER,
  optimal_send_hour_updated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their preferences"
  ON notification_preferences USING (user_id = auth.uid());
```

---

## Usage Enforcement (Paywall)

```sql
-- Function to check if user can create a journal entry
CREATE OR REPLACE FUNCTION can_create_journal_entry(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    CASE
      WHEN s.plan = 'pro' THEN true
      WHEN s.status IN ('trialing', 'active') AND s.plan = 'pro' THEN true
      WHEN s.entries_this_month < 7 THEN true
      ELSE false
    END
  FROM subscriptions s
  WHERE s.user_id = p_user_id;
$$;
```

---

## Indexes Summary

| Table | Index | Type | Purpose |
|---|---|---|---|
| `journal_entries` | `(user_id, created_at DESC)` | BTREE | List queries |
| `journal_entries` | `content` (tsvector) | GIN | Full-text search |
| `memories` | `embedding` | IVFFlat | ANN vector search |
| `memories` | `(user_id, created_at DESC)` | BTREE | List queries |
| `identity_nodes` | `(user_id, confidence DESC)` | BTREE | Top nodes query |
| `echo_messages` | `(session_id, created_at ASC)` | BTREE | Conversation order |

---

## Migration Files

| File | Purpose |
|---|---|
| `001_initial_schema.sql` | Extensions, profiles, auth trigger |
| `002_journal.sql` | journal_entries, indexes |
| `003_ai_memory.sql` | memories, embeddings, retrieve_memories() |
| `004_identity.sql` | identity_nodes, identity_edges, future_self_predictions |
| `005_echo.sql` | echo_sessions, echo_messages |
| `006_monetization.sql` | subscriptions, can_create_journal_entry() |
| `007_growth.sql` | referrals, notification_preferences |
