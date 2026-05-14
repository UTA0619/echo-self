# Technical Architecture — ECHO//SELF

**Version:** 1.0 | **Date:** 2026-05-14

---

## System Overview

```
                        ┌─────────────────────────────────────────┐
                        │           ECHO//SELF                     │
                        │                                          │
                        │  ┌──────────┐     ┌───────────────────┐ │
                        │  │  Mobile  │     │    Vercel Edge     │ │
                        │  │  (Expo)  │────▶│   (Next.js API)   │ │
                        │  │  React   │     │  Edge Functions    │ │
                        │  └──────────┘     └─────────┬─────────┘ │
                        │                             │           │
                        │              ┌──────────────┼────────┐  │
                        │              ▼              ▼        ▼  │
                        │       ┌──────────┐  ┌──────────┐  ┌────┤ │
                        │       │Supabase  │  │ OpenAI   │  │Str│ │
                        │       │ Auth +   │  │ GPT-4o   │  │ipe│ │
                        │       │ DB (pg)  │  │ Whisper  │  │   │ │
                        │       │ pgvector │  │ Embed-3  │  └────┤ │
                        │       │ Realtime │  └──────────┘       │ │
                        │       │ Edge Fn  │                     │ │
                        │       └──────────┘                     │ │
                        └─────────────────────────────────────────┘
```

---

## Component Map

### Frontend Layer

**Framework:** React (via Lovable), TypeScript, Expo (iOS + Android)

| Component | Purpose | Key Files |
|---|---|---|
| App Shell | Navigation, auth state, theming | `src/App.tsx`, `src/navigation/` |
| Screen Components | Full screens (journal, echo, identity) | `src/screens/` |
| UI Components | Reusable atoms (Button, Input, Card) | `src/components/` |
| AI Hooks | Streaming, session management | `src/hooks/useEchoSession.ts`, `useJournal.ts` |
| Supabase Client | DB queries, auth, realtime | `src/lib/supabase.ts` |
| State Management | Zustand stores (auth, journal, identity) | `src/stores/` |
| Animation Layer | Framer Motion, haptics | `src/components/motion/` |

### API Layer (Vercel Edge Functions / Next.js Routes)

| Endpoint | Runtime | Purpose |
|---|---|---|
| `POST /api/journal` | Node.js | Create/update journal entries |
| `POST /api/echo/session` | Node.js | Start Echo session (streaming) |
| `POST /api/voice` | Node.js | Whisper transcription |
| `GET /api/identity` | Node.js | Fetch identity graph |
| `POST /api/stripe/checkout` | Node.js | Create Stripe checkout session |
| `POST /api/stripe/webhook` | Node.js | Process Stripe events |
| `POST /api/stripe/portal` | Node.js | Customer portal URL |
| `GET /api/referral/share` | Edge | Generate OG share image |
| `POST /api/referral/track` | Node.js | Track referral attribution |
| `GET /api/cron/*` | Node.js | Cron job endpoints (Vercel Crons) |

### Supabase Layer

| Service | Usage |
|---|---|
| **Auth** | JWT, OAuth (Apple, Google), session management |
| **PostgreSQL** | All primary data: users, entries, memories, identity |
| **pgvector** | Vector embeddings (3072-dim), similarity search |
| **Edge Functions** | AI processing: emotion, memory, embeddings (Deno runtime) |
| **Realtime** | Live sync: streaming AI responses, presence |
| **Storage** | Audio recordings (pre-transcription) |

### External Services

| Service | Usage | Timeout | Fallback |
|---|---|---|---|
| OpenAI GPT-4o | Echo sessions, emotion analysis, identity extraction | 30s | Queue for retry |
| OpenAI Whisper | Voice-to-text transcription | 60s | Manual text entry |
| OpenAI text-embedding-3-large | Memory + entry embeddings | 10s | Retry 3x |
| Stripe | Subscription billing, webhooks | 15s | Retry via webhook |
| OneSignal | Push notifications | 5s | Skip silently |
| PostHog | Product analytics, feature flags | 1s (async) | Skip silently |
| Sentry | Error tracking, performance | 1s (async) | Skip silently |
| Cloudflare | CDN, DDoS protection | — | — |

---

## Data Flow

### Journal Entry → Memory Pipeline

```
User writes entry (React)
        │
        ▼
POST /api/journal (Vercel Node.js)
  - Validate JWT
  - Validate input (Zod)
  - Save entry to PostgreSQL
  - Trigger AI processing (async via Supabase Edge Function)
        │
        ▼
Supabase Edge Function: process-journal-entry
  1. Emotion analysis (GPT-4o)
     → store in journal_entries.emotions (JSONB)
  2. Memory extraction (GPT-4o)
     → store N memories in memories table
  3. Embedding generation (text-embedding-3-large)
     → store vector in memories.embedding (VECTOR(3072))
  4. Update user's last_active timestamp
        │
        ▼
Supabase Realtime broadcast → client
  - Emotion tags appear on journal entry UI
  - Home screen insight updates
```

### Echo Session Pipeline

```
User opens Echo session (React)
        │
        ▼
POST /api/echo/session (Vercel Node.js, streaming)
  1. Fetch user context (last emotion, streak, recent entries)
  2. Semantic memory retrieval (pgvector cosine similarity)
     SELECT * FROM memories WHERE user_id = $1
     ORDER BY embedding <=> query_embedding LIMIT 10
  3. Construct system prompt (memories + context + identity nodes)
  4. Stream GPT-4o response (SSE)
  5. Client renders word-by-word
        │
        ▼ (on session end)
  6. Store session as journal_entry (type: 'echo_session')
  7. Extract session insight (GPT-4o, brief)
  8. Update identity graph (async)
```

---

## Security Architecture

### Authentication Flow

```
Client → Supabase Auth (JWT issuance)
       → Vercel API routes (JWT validation via Supabase)
       → Supabase DB (RLS policies enforce user isolation)
```

Every API route validates the Supabase JWT before executing:
```typescript
const supabase = createClient(url, anonKey, {
  global: { headers: { Authorization: req.headers.get('Authorization')! } }
})
const { data: { user } } = await supabase.auth.getUser()
if (!user) return new Response('Unauthorized', { status: 401 })
```

### Data Isolation

- RLS enforces `user_id = auth.uid()` on every table
- AI processing functions use service-role key in isolated Edge Functions
- OpenAI API key stored in Supabase Vault, never in client code
- User data never crosses user boundaries in application logic

### Rate Limiting

```typescript
// Middleware: src/middleware.ts
const rateLimiter = {
  '/api/echo': { rpm: 10, per: 'user' },
  '/api/journal': { rpm: 30, per: 'user' },
  '/api/voice': { rpm: 5, per: 'user' },
  '/api/*': { rpm: 100, per: 'user' },
}
```

---

## Cron Architecture (Vercel Crons)

| Cron | Schedule | Function | Purpose |
|---|---|---|---|
| `process-memory-embeddings` | `*/15 * * * *` | Batch embed pending memories | Catches any embedding failures |
| `generate-daily-insight` | `0 8 * * *` | GPT-4o insight from weekly memories | Daily insight notification |
| `send-streak-reminders` | `0 19 * * *` | OneSignal push | Daily engagement |
| `update-future-self-predictions` | `0 3 * * *` | Identity → prediction update | Weekly prediction refresh |
| `cleanup-expired-sessions` | `0 0 * * *` | Delete stale auth sessions | DB hygiene |
| `billing-usage-sync` | `0 1 * * *` | Sync Stripe usage to Supabase | Ensure paywall accuracy |

All cron endpoints validate `Authorization: Bearer {CRON_SECRET}`.

---

## Realtime Architecture

Supabase Realtime powers:

1. **AI streaming responses** — Echo session responses stream via Realtime channel
2. **Emotion tag updates** — After AI processing, emotion tags appear without page refresh
3. **Identity graph updates** — Node changes broadcast to Identity screen
4. **Presence** — Future feature: multiple devices sync

```typescript
// Client: subscribe to user's processing channel
const channel = supabase
  .channel(`user:${userId}:processing`)
  .on('broadcast', { event: 'emotion-update' }, ({ payload }) => {
    updateEntryEmotions(payload.entryId, payload.emotions)
  })
  .subscribe()
```

---

## Performance Architecture

### Database

- **Connection pooling:** Supavisor (Supabase's built-in pooler), max 25 connections
- **Query optimization:**
  - All user-scoped queries have composite index on `(user_id, created_at DESC)`
  - pgvector IVFFlat index with 100 lists for < 1M vectors per user
  - `pg_trgm` extension for full-text journal search
- **Read replicas:** Enabled for identity graph queries (read-heavy, not write-critical)

### AI Cost Optimization

- **Embedding caching:** SHA-256 hash of input text → cache in Redis/KV for 24 hours
- **Batching:** Never embed one text at a time — batch up to 100 texts per API call
- **Token budgeting:** System prompts trimmed to top-10 memories, not all memories
- **Model selection:** GPT-4o-mini for emotion analysis (fast, cheap), GPT-4o for Echo sessions (quality-critical)

### Frontend

- Code splitting per screen (React.lazy)
- Framer Motion animations use `transform` only (no layout thrashing)
- Images served via Vercel's image optimization
- Supabase queries via React Query with 60s stale time for non-critical data

---

## Environment Architecture

| Environment | Supabase | Vercel | OpenAI | Stripe |
|---|---|---|---|---|
| Local dev | Local (docker) | `vercel dev` | Real (limited) | Test mode |
| Preview | Preview project | Preview deployment | Real (rate limited) | Test mode |
| Staging | Staging project | Staging deployment | Real | Test mode |
| Production | Production project | Production | Real | Live |

---

## Monitoring Architecture

| Tool | Purpose | Alert Threshold |
|---|---|---|
| Sentry | Error tracking, performance | Error rate > 0.1%, P95 > 2s |
| Vercel Analytics | Page views, traffic | — |
| Vercel Speed Insights | Core Web Vitals | LCP > 3s, INP > 300ms |
| PostHog | Product analytics, funnels | — |
| Supabase Dashboard | DB performance, connections | — |

See: [MONITORING.md](../operations/MONITORING.md)
