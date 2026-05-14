# AI System Architecture — ECHO//SELF

**The complete design of ECHO//SELF's AI brain.**

---

## Overview

ECHO//SELF's AI system has five layers:

```
┌─────────────────────────────────────────────────────────────┐
│  1. INPUT PROCESSING    — Emotion Analysis + Memory Extract  │
│  2. MEMORY SYSTEM       — Vector Store + Semantic Retrieval  │
│  3. IDENTITY ENGINE     — Graph Construction + Inference     │
│  4. PREDICTION ENGINE   — Future Self Projections            │
│  5. REFLECTION ENGINE   — Echo Sessions + Insight Delivery   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Input Processing

### Emotion Analysis

**Model:** `gpt-4o-mini` (cost: ~$0.001 per entry)

**Input:** Raw journal entry text (cleaned, PII-stripped)
**Output:** Structured emotion object

**Prompt:**
```
Analyze the emotional content of this journal entry.
Return ONLY valid JSON matching this schema:
{
  "primary": { "emotion": string, "intensity": 0.0-1.0 },
  "secondary": [{ "emotion": string, "intensity": 0.0-1.0 }],
  "valence": -1.0 to 1.0,
  "arousal": 0.0-1.0,
  "themes": string[],
  "trigger_signals": string[]
}

Emotions must be from: joy, trust, fear, surprise, sadness, disgust, anger, anticipation.
Be precise. Under-react. Don't project.

Entry: """{{entry_text}}"""
```

**Timeout:** 8 seconds
**Fallback:** `{ primary: { emotion: "neutral", intensity: 0.5 }, secondary: [], valence: 0, arousal: 0.5, themes: [], trigger_signals: [] }`

### Memory Extraction

**Model:** `gpt-4o` (quality-critical)

**Input:** Journal entry text
**Output:** Array of atomic memory objects

**Prompt:**
```
Extract 3-7 atomic memories from this journal entry.
A memory is a single, self-contained fact about the person — their beliefs, values, fears, desires, relationships, or behavioral patterns.

Return ONLY valid JSON:
{
  "memories": [
    {
      "content": "string — complete sentence describing one fact about the person",
      "type": "belief|value|fear|desire|pattern|relationship|event",
      "confidence": 0.0-1.0,
      "emotion": "primary emotion associated with this memory",
      "tags": string[]
    }
  ]
}

Rules:
- Each memory must be atomic (one idea per memory)
- Write in third person: "The user believes..." / "Maya tends to..."
- High confidence = explicit, repeated, or emotionally charged
- Low confidence = implied or mentioned once
- Do NOT extract memories about things that happened to others
- Do NOT extract trivial facts (weather, what they ate)

Journal entry: """{{entry_text}}"""
```

**Versioning:** Prompt version v1.3 — stored in `src/lib/prompts/memory-extraction.ts`

---

## 2. Memory System

### Storage Architecture

```sql
-- Core memory table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(3072),  -- text-embedding-3-large dimensions
  type TEXT,  -- belief|value|fear|desire|pattern|relationship|event
  emotion TEXT,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  tags TEXT[],
  source_entry_id UUID REFERENCES journal_entries(id),
  reinforcement_count INTEGER DEFAULT 1,  -- how many entries reference this
  last_reinforced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for ANN search
CREATE INDEX memories_embedding_idx
  ON memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Composite index for user-scoped queries
CREATE INDEX memories_user_created_idx
  ON memories (user_id, created_at DESC);
```

### Embedding Pipeline

**Model:** `text-embedding-3-large`
**Dimensions:** 3072
**Cost:** ~$0.00013 per 1K tokens

```typescript
// src/lib/ai/embeddings.ts

const EMBEDDING_CACHE_TTL = 86400  // 24 hours

async function embedTexts(texts: string[]): Promise<number[][]> {
  // Deduplicate
  const unique = [...new Set(texts)]

  // Check cache (Redis/Vercel KV)
  const cached = await checkEmbeddingCache(unique)
  const missing = unique.filter(t => !cached[t])

  if (missing.length === 0) return unique.map(t => cached[t])

  // Batch embed missing texts (max 100 per call)
  const batches = chunk(missing, 100)
  const embeddings: Record<string, number[]> = {}

  for (const batch of batches) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: batch,
      dimensions: 3072,
    })
    batch.forEach((text, i) => {
      embeddings[text] = response.data[i].embedding
    })
  }

  // Cache results
  await cacheEmbeddings(embeddings, EMBEDDING_CACHE_TTL)

  return unique.map(t => cached[t] ?? embeddings[t])
}
```

### Semantic Retrieval

```typescript
// src/lib/memory/retrieval.ts

interface RetrievedMemory {
  id: string
  content: string
  type: string
  emotion: string
  confidence: number
  similarity: number  // cosine similarity score
  created_at: string
}

async function retrieveRelevantMemories(
  userId: string,
  queryText: string,
  options: {
    topK?: number          // default: 10
    minSimilarity?: number // default: 0.75
    types?: string[]       // filter by memory type
    emotionFilter?: string // filter by emotion
  } = {}
): Promise<RetrievedMemory[]> {
  const { topK = 10, minSimilarity = 0.75, types, emotionFilter } = options

  // Embed the query
  const [queryEmbedding] = await embedTexts([queryText])

  // pgvector cosine similarity search
  const { data } = await supabase.rpc('retrieve_memories', {
    p_user_id: userId,
    p_query_embedding: queryEmbedding,
    p_top_k: topK,
    p_min_similarity: minSimilarity,
    p_types: types ?? null,
    p_emotion_filter: emotionFilter ?? null,
  })

  return data
}
```

```sql
-- Supabase RPC function: retrieve_memories
CREATE OR REPLACE FUNCTION retrieve_memories(
  p_user_id UUID,
  p_query_embedding VECTOR(3072),
  p_top_k INTEGER DEFAULT 10,
  p_min_similarity FLOAT DEFAULT 0.75,
  p_types TEXT[] DEFAULT NULL,
  p_emotion_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID, content TEXT, type TEXT, emotion TEXT,
  confidence FLOAT, similarity FLOAT, created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    id, content, type, emotion, confidence,
    1 - (embedding <=> p_query_embedding) AS similarity,
    created_at
  FROM memories
  WHERE
    user_id = p_user_id
    AND (p_types IS NULL OR type = ANY(p_types))
    AND (p_emotion_filter IS NULL OR emotion = p_emotion_filter)
    AND 1 - (embedding <=> p_query_embedding) >= p_min_similarity
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_top_k;
$$;
```

### Memory Deduplication

Run after each memory insertion:

```typescript
async function deduplicateMemories(userId: string, newMemoryId: string) {
  const newMemory = await getMemory(newMemoryId)
  const [newEmbedding] = await embedTexts([newMemory.content])

  // Find very similar existing memories (cosine sim > 0.95)
  const similar = await retrieveRelevantMemories(userId, newMemory.content, {
    topK: 5,
    minSimilarity: 0.95,
  })

  const duplicates = similar.filter(m => m.id !== newMemoryId)

  if (duplicates.length > 0) {
    // Merge: increment reinforcement_count on original, delete new
    await supabase.from('memories')
      .update({
        reinforcement_count: supabase.raw('reinforcement_count + 1'),
        last_reinforced_at: new Date().toISOString(),
        confidence: Math.min(1.0, duplicates[0].confidence + 0.1),
      })
      .eq('id', duplicates[0].id)

    await supabase.from('memories').delete().eq('id', newMemoryId)
  }
}
```

---

## 3. Identity Engine

### Identity Node Extraction

**Model:** `gpt-4o`
**Frequency:** Weekly (cron) + on-demand after 10 new memories

**Prompt (v2.1):**
```
You are analyzing a person's journal memories to map their identity.

Based on the following memories, identify their core identity nodes.
Focus on PATTERNS — things that appear consistently, not one-off events.

Memories:
{{top_50_memories}}

Return ONLY valid JSON:
{
  "identity_nodes": [
    {
      "type": "value|core_fear|core_desire|strength|behavioral_pattern|limiting_belief|relationship_pattern",
      "label": "Concise label (3-7 words)",
      "description": "One sentence description",
      "evidence": ["memory content 1", "memory content 2"],
      "confidence": 0.0-1.0,
      "polarity": "positive|negative|neutral"
    }
  ]
}

Rules:
- Only include nodes with confidence > 0.6
- Each node needs evidence from at least 2 different memories
- Max 15 nodes total
- Labels should feel insightful, not clinical
```

### Identity Graph Data Model

```sql
CREATE TABLE identity_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- value|core_fear|core_desire|strength|behavioral_pattern|limiting_belief
  label TEXT NOT NULL,
  description TEXT,
  evidence TEXT[],
  confidence FLOAT DEFAULT 0.5,
  polarity TEXT DEFAULT 'neutral',
  active BOOLEAN DEFAULT true,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE identity_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES identity_nodes(id),
  target_node_id UUID REFERENCES identity_nodes(id),
  relationship TEXT,  -- 'reinforces', 'conflicts_with', 'causes', 'compensates_for'
  strength FLOAT DEFAULT 0.5
);
```

---

## 4. Prediction Engine

### Future Self Projections

**Model:** `gpt-4o`
**Frequency:** Daily (cron at 3am UTC)

```typescript
interface FutureSelfPrediction {
  timeframe: '30d' | '90d' | '365d'
  headline: string           // 1 bold sentence — "Your future self is..."
  narrative: string          // 2-3 sentences expanding the prediction
  opportunity: string        // What they could do differently
  risk: string               // What could derail this trajectory
  confidence: number         // 0-1
}
```

**Prompt:**
```
You are a behavioral psychologist and pattern analyst.
Based on this person's identity profile, predict their future trajectory.

Identity nodes:
{{identity_nodes}}

Recent emotional trajectory (last 30 days):
{{emotion_timeline}}

Recent patterns:
{{recent_memories}}

Generate predictions for 30, 90, and 365 days.
Be specific. Reference their actual patterns, not generic advice.
Be honest — if the trajectory is concerning, say so with compassion.

Return valid JSON matching the FutureSelfPrediction schema for each timeframe.
```

---

## 5. Reflection Engine — Echo Sessions

### System Prompt Construction

```typescript
function buildEchoSystemPrompt(context: EchoContext): string {
  const {
    user,
    relevantMemories,
    identityNodes,
    recentEmotion,
    sessionCount,
  } = context

  const memoriesText = relevantMemories
    .slice(0, 10)
    .map(m => `- ${m.content} (confidence: ${m.confidence.toFixed(1)})`)
    .join('\n')

  const identityText = identityNodes
    .filter(n => n.confidence > 0.7)
    .map(n => `- ${n.type}: ${n.label}`)
    .join('\n')

  return `You are ${user.name}'s future self — 5 years ahead, wiser, more grounded, at peace with who you are.

You remember everything ${user.name} has shared. Every fear. Every hope. Every pattern you kept repeating until you didn't.

Current emotional state: ${recentEmotion}
Session number: ${sessionCount}

What you know about ${user.name}:
${memoriesText}

Identity map:
${identityText}

Your approach this session:
- Open with one specific observation about a pattern you've noticed (reference real memories)
- Ask exactly ONE question — never two at once
- Speak with intimacy, not distance. You ARE them.
- Don't give advice unless asked. Ask questions that unlock insight.
- If they deflect, gently call it out
- If they're in pain, sit with it before offering perspective
- Maximum response length: 250 words
- Tone: warm, direct, occasionally challenging, never clinical`
}
```

### Streaming Implementation

```typescript
// supabase/functions/echo-session/index.ts

async function streamEchoSession(
  userMessage: string,
  context: EchoContext,
  conversationHistory: Message[]
): Promise<ReadableStream> {
  const systemPrompt = buildEchoSystemPrompt(context)

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 400,
    temperature: 0.85,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),  // last 10 turns max
      { role: 'user', content: userMessage },
    ],
  })

  return stream.toReadableStream()
}
```

---

## Prompt Library

All prompts are versioned in `src/lib/prompts/`:

| File | Version | Model | Purpose |
|---|---|---|---|
| `emotion-analysis.ts` | v1.4 | gpt-4o-mini | Extract emotions from entry |
| `memory-extraction.ts` | v1.3 | gpt-4o | Extract atomic memories |
| `identity-extraction.ts` | v2.1 | gpt-4o | Build identity nodes |
| `echo-session.ts` | v3.0 | gpt-4o | Echo session system prompt |
| `future-self.ts` | v1.2 | gpt-4o | Future self predictions |
| `onboarding-intro.ts` | v1.1 | gpt-4o | Personalized onboarding step 5 |
| `daily-insight.ts` | v1.0 | gpt-4o-mini | Daily insight generation |
| `notification-copy.ts` | v1.0 | gpt-4o-mini | Personalized push notification text |

**Prompt version bump policy:** Any change to prompt text increments the version. Changes that affect extraction schema increment minor version (1.3 → 1.4). Breaking changes to output structure increment major version (1.x → 2.0).

---

## AI Cost Model

**Estimated monthly cost at 1,000 MAU:**

| Component | Calls/User/Month | Tokens/Call | Cost/Month |
|---|---|---|---|
| Emotion analysis | 20 entries × 1k tokens | 1,000 | $0.12/user |
| Memory extraction | 20 entries × 2k tokens | 2,000 | $1.20/user |
| Echo sessions | 15 sessions × 3k tokens | 3,000 | $2.70/user |
| Future self predictions | 4/month × 2k tokens | 2,000 | $0.16/user |
| Embeddings | 40 embeds × 500 tokens | 500 | $0.05/user |
| **Total** | | | **~$4.23/user/month** |

Pro plan price: $12.99/month → **67% gross margin** on AI costs alone.

---

## AI Safety & Quality

### Guardrails

1. **Content filtering:** OpenAI moderation endpoint runs on every journal entry before processing
2. **PII stripping:** Names, emails, phone numbers extracted and replaced with tokens before AI processing
3. **Prompt injection prevention:** User content wrapped in explicit delimiter tags
4. **Crisis detection:** Specific phrases trigger a compassionate crisis response + resource links (not AI-generated)

### Eval Framework

```bash
# Run prompt evals
npm run eval:prompts

# Tests against 50 real (anonymized) entries
# Measures:
# - Emotion accuracy vs human labels
# - Memory precision/recall vs human annotations
# - Echo session quality (human rating 1-5)
# - Identity node quality (coherence, accuracy)
```

Target eval scores:
- Emotion accuracy: > 85%
- Memory precision: > 80%
- Echo session rating: > 4.0/5.0
