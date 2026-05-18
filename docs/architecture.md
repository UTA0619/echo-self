# ECHO — Architecture Reference

*Last updated: 2026-05-18*

---

## System Overview

ECHO is a modular monorepo (`pnpm` workspaces + Turborepo) with three primary layers:

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (apps/)                                        │
│  ├── apps/web    — Next.js 15, App Router, Vercel       │
│  └── apps/mobile — Expo (React Native), EAS Build       │
├─────────────────────────────────────────────────────────┤
│  Packages (packages/)                                    │
│  ├── @echo/shared    — TypeScript types, shared utils   │
│  ├── @echo/ai-core   — AI orchestration layer           │
│  └── @echo/supabase  — Migrations, Edge Functions       │
├─────────────────────────────────────────────────────────┤
│  Infrastructure                                          │
│  ├── Supabase        — Auth, Postgres, Storage, Realtime │
│  ├── Vercel          — Hosting, Edge CDN, Previews      │
│  └── GitHub Actions  — CI/CD, migrations, labeling      │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Memory Ingestion

```
User Input (text/voice/photo)
  → apps/web (client)
  → Supabase Edge Function: memory-ingest
      ├── OpenAI Moderation API (safety check)
      ├── Whisper API (if voice → transcription)
      ├── text-embedding-3-small (embedding)
      ├── Claude Haiku (behavioral tags)
      └── Claude Haiku (emotion classification)
  → Stored in: memories + memory_behavioral_tags + emotional_events
```

### Memory Retrieval (ECHO Conversation)

```
User query
  → text-embedding-3-small (query embedding)
  → pgvector HNSW search (top-10 semantic matches)
  → Recent memories (last 7 days, appended)
  → Claude Sonnet (RAG response with memory context)
  → Streamed back to user
```

### Daily Compression Cron

```
Supabase Cron (2am user timezone)
  → Fetch day's memories
  → Claude Sonnet (compress → daily summary)
  → text-embedding-3-small (summary embedding)
  → Claude Sonnet (pattern detection over trailing 30 days)
  → Store: memory_summaries + behavioral_patterns
```

---

## AI Model Routing

| Task | Model | Cost tier |
|------|-------|-----------|
| Behavioral tagging | claude-haiku-4-5 | Low |
| Emotion classification | claude-haiku-4-5 | Low |
| Memory compression | claude-sonnet-4-6 | Medium |
| Pattern detection | claude-sonnet-4-6 | Medium |
| Future Self narrative | gpt-4o | Medium |
| Future Self letter | claude-sonnet-4-6 | Medium |
| ECHO conversation | claude-sonnet-4-6 | Medium |
| Embeddings | text-embedding-3-small | Very low |
| Transcription | whisper-1 | Low |
| Moderation | openai moderation | Free |

---

## Database Schema Summary

Core tables (all with RLS, user_id FK):

| Table | Purpose |
|-------|---------|
| `profiles` | User account, subscription tier |
| `memories` | Raw memory entries + vector embedding |
| `memory_summaries` | Compressed day/week/month/year summaries |
| `identity_traits` | Detected personality traits + confidence |
| `memory_behavioral_tags` | Per-memory behavioral signals |
| `emotional_events` | Per-memory emotional classification |
| `behavioral_patterns` | Recurring detected patterns |
| `future_self_simulations` | Generated Future Self narratives + letters |
| `interventions` | Delivered nudges + user response |

Vector search: `pgvector` HNSW index on `memories.embedding` and `memory_summaries.embedding`.

RPC: `match_memories(query_embedding, threshold, count, user_id)` — similarity search with user isolation.

---

## Authentication Flow

```
User → Supabase Auth (magic link or Google OAuth)
  → JWT issued (1h expiry + refresh token)
  → Middleware validates JWT on every request
  → RLS policies enforce user isolation at DB layer
  → Service role key only used in Edge Functions (server-side)
```

---

## Environment Structure

| Environment | Branch | Supabase | Vercel |
|-------------|--------|----------|--------|
| Production | main | echo-prod | production |
| Staging | develop | echo-staging | preview |
| Local | feat/* | echo-local | .env.local |

---

## Branching Convention

```
main      ← production (protected)
develop   ← staging integration
feat/*    ← feature work
fix/*     ← bug fixes
chore/*   ← tooling / config
epic-0N   ← long-running epic branches
```

All PRs target `develop`. `develop` → `main` via PR after staging validation.

---

## Cost Model

| Users (Pro) | AI cost/mo | Infra/mo | Revenue/mo | Gross Margin |
|-------------|-----------|---------|-----------|-------------|
| 100 | ~$50 | $50 | $1,200 | ~92% |
| 1,000 | ~$500 | $150 | $12,000 | ~95% |
| 10,000 | ~$4,000 | $600 | $120,000 | ~96% |

Free tier AI cost: ~$0.01/user/month (embeddings only, 10 memories/day cap).

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/shared/src/types/` | Single source of truth for all types |
| `packages/ai-core/src/orchestrator.ts` | Model routing |
| `packages/ai-core/src/prompts/loader.ts` | All versioned prompts |
| `packages/supabase/migrations/` | DB migration history |
| `packages/supabase/functions/` | Supabase Edge Functions |
| `apps/web/lib/supabase/server.ts` | Server-side Supabase client |
| `apps/web/middleware.ts` | Auth guard + session refresh |
| `.github/workflows/ci.yml` | Lint + typecheck + test |
| `.github/workflows/deploy-web.yml` | Vercel deploy (prebuilt pattern) |
| `.github/workflows/supabase-migrate.yml` | Auto-run migrations on push |

---

## Adding a New Feature

1. Create issue with appropriate epic label and size
2. Create branch: `git checkout -b feat/your-feature develop`
3. If DB change: add migration in `packages/supabase/migrations/`
4. If new type: add to `packages/shared/src/types/`
5. If new AI task: add to `packages/ai-core/src/` + prompt in `prompts/loader.ts`
6. UI: generate in Lovable, paste into `apps/web/components/echo/`
7. PR → `develop` with PR template filled out
8. Validate on staging preview URL
9. PR `develop` → `main` for production
