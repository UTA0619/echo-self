# Eidolon — Architecture Document

Version: 0.1
Last Updated: 2026-05-22

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Flutter)                      │
│  iOS / Android / Web (PWA)                              │
│  Flame Engine + Riverpod + GoRouter                     │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS / WSS
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌───────▼──────────────────────────┐
│   Firebase   │  │         Supabase                  │
│  Auth        │  │  PostgreSQL + pgvector            │
│  Firestore   │  │  Edge Functions (Deno)            │
│  Storage     │  │  Realtime                         │
│  Remote Cfg  │  └───────────────────────────────────┘
│  Crashlytics │
└──────────────┘
        │
┌───────▼──────────────────────────────────────────────┐
│              Cloudflare Workers (LLM Proxy)           │
│  Rate limiting / Auth / Cost guard                    │
└───────┬──────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────┐
│                    AI Layer                           │
│  Claude Sonnet 4.5   → Story / critical scenes       │
│  Claude Haiku 4.5    → Events / dialogue / classify  │
│  GPT-4o-mini         → Fallback                      │
│  Replicate SDXL      → Dynamic assets                │
│  ElevenLabs Flash    → Eidolon voice                 │
└──────────────────────────────────────────────────────┘
```

---

## 2. Flutter App Architecture

Clean Architecture with Riverpod as the DI/state container.

```
lib/
├── core/
│   ├── di/          # Riverpod providers
│   ├── router/      # GoRouter configuration
│   ├── theme/       # Design system tokens
│   ├── network/     # Dio client + interceptors
│   ├── error/       # Result<T,E> + AppError types
│   └── utils/
├── features/
│   └── <feature>/   # Clean Architecture (data/domain/presentation)
├── game/
│   ├── engine/      # Flame game wrapper
│   ├── components/  # Flame components
│   └── scenes/      # Game scenes
└── i18n/            # ARB files
```

### Data Flow

```
UI (Widget) → Provider (Riverpod) → UseCase → Repository
                                                  ↓
                                         DataSource (Remote/Local)
                                                  ↓
                                         Firebase / Supabase / Cache
```

---

## 3. Backend Architecture

### 3.1 Firebase Cloud Functions
- Triggered by Firestore events, HTTP, and Pub/Sub
- TypeScript + Firebase Admin SDK
- Deployed via GitHub Actions → Firebase CLI

### 3.2 Supabase Edge Functions (Deno)
- AI orchestration (Eidolon respond, dungeon gen)
- Called from client via Supabase JS client
- Secrets managed via Supabase Vault

### 3.3 Cloudflare Workers
- LLM proxy: rate limiting per user, cost tracking
- R2 for game asset CDN delivery
- Response streaming for AI dialogue

---

## 4. Database Schema (Supabase PostgreSQL)

Key tables (full migrations in `backend/supabase/migrations/`):

```sql
-- Core entities
users (id, firebase_uid, created_at, settings)
eidolons (id, user_id, name, personality_ocean, level, xp)
memories (id, eidolon_id, type, content, embedding vector(1536), importance, created_at)
dungeons (id, theme, difficulty, generated_at, layout jsonb)
runs (id, eidolon_id, dungeon_id, started_at, completed_at, result jsonb)

-- Social
visits (id, visitor_eidolon_id, host_user_id, interaction_type, resolved_at)
guilds (id, name, description, created_by)
guild_members (guild_id, user_id, role, joined_at)

-- Monetization
subscriptions (id, user_id, tier, revenuecat_id, expires_at)
gacha_pulls (id, user_id, pool_id, result jsonb, pulled_at)
```

---

## 5. AI Pipeline

### Eidolon Respond
```
Client request
  → Cloudflare Worker (auth + rate limit)
  → Supabase Edge Function /eidolon/respond
  → Fetch top-5 relevant memories (pgvector cosine search)
  → Construct prompt (Big Five + memories + emotion + quest)
  → Claude Haiku (dialogue) or Sonnet (critical narrative)
  → Store new memory + update importance scores
  → Return to client
```

### Dungeon Generation
```
Client requests dungeon
  → /dungeon/generate Edge Function
  → Claude Haiku: generate room layout + event descriptions
  → Store in dungeons table
  → Return dungeon config to client
  → Flame Engine renders locally
```

---

## 6. Security Model

- All client→server calls authenticated via Firebase ID token
- Row-Level Security (RLS) on all Supabase tables
- API keys never in client; only in Cloud Functions / Edge Functions / Workers
- Cloudflare WAF in front of all public endpoints
- OWASP MASVS L1 checklist enforced in CI

---

## 7. Offline & Resilience

- Firestore offline persistence for core game state
- Hive local DB for Eidolon cache (fast startup)
- AI fallback: Claude → GPT-4o-mini → local template
- Dungeon can run fully offline with pre-cached content pool
