# ECHO — Claude Code Context

## Project
ECHO is an AI-native memory layer, identity OS, and future-self cognition platform.
GitHub: https://github.com/UTA0619/echo-self
Git root: `/Users/newworld/` (the repo covers the home directory)

## Stack
- **Mobile:** `apps/mobile` — Expo 51 (React Native) — primary app
- **Web:** `apps/web` — Next.js 15 (App Router) — web companion
- **Backend:** Supabase (Auth, Postgres + pgvector, Edge Functions, Storage)
- **AI:** Anthropic Claude (claude-sonnet-4-6, claude-haiku-4-5) + OpenAI (gpt-4o, embeddings, Whisper)
- **Monorepo:** pnpm workspaces + Turborepo
- **Hosting:** Vercel (web) + EAS Build (mobile)
- **Analytics:** PostHog + Sentry

## Package Naming Convention
All packages use `@echo-self/` prefix:
- `@echo-self/shared-types` — TypeScript types
- `@echo-self/ai-core` — AI orchestration
- `@echo-self/supabase` — Supabase clients
- `@echo-self/auth` — Auth utilities
- `@echo-self/database` — DB migrations + types
- `@echo-self/mobile` — Expo app
- `@echo-self/web` — Next.js web app

## Coding Conventions
- TypeScript strict mode everywhere
- Use `@echo-self/shared-types` — never redefine types that already exist there
- Supabase client: use `lib/supabase/server.ts` in Server Components, `lib/supabase/client.ts` in Client Components
- Data fetching: TanStack Query on client, server actions / RSC on server
- Forms: React Hook Form + Zod
- State: Zustand for client UI state only
- All AI calls go through Supabase Edge Functions in `supabase/functions/` — never call AI APIs directly from the frontend
- RLS enforced at DB layer — always include `user_id` in queries as second defense

## Design System (web)
- Background: `#0A0B0F` | Surface: `#141620` | Accent: `#7B6CF6` | Warm: `#F6A26C`
- Font display: Geist | Body: Inter | Mono: Geist Mono
- Tailwind: use `echo-` prefixed colors (`bg-echo-surface`, `text-echo-accent`, `border-echo`)
- Animations: Framer Motion for memory reveals, CSS for ambient pulse effects

## AI Prompt Policy
- All prompts live in `packages/ai-core/src/prompts/`
- Never hardcode prompts inside edge functions
- Use Claude Haiku for classification (behavioral tags, emotion), Claude Sonnet for generation/reasoning
- Always ground responses in user's actual memory data

## Branch Workflow
- `main` — production (protected)
- `develop` — staging integration
- Feature branches from `develop`: `git checkout -b feat/description`
- PRs target `develop` → review on staging → merge to `main`

## Key Paths
- Shared types: `packages/shared-types/src/`
- AI logic: `packages/ai-core/src/`
- DB migrations: `packages/database/migrations/`
- Edge functions: `supabase/functions/`
- Supabase clients: `packages/supabase/src/client/`
- Web app: `apps/web/`
- Mobile app: `apps/mobile/src/`

## turbo run vs turbo
- Always use `turbo run <task>` in scripts and CI — not bare `turbo <task>`
- `turbo.json` uses `tasks` key (not the deprecated `pipeline` key)
