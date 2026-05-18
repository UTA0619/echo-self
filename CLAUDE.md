# ECHO — Claude Code Context

## Project
ECHO is an AI-native memory layer, identity OS, and future-self cognition platform.
GitHub: https://github.com/UTA0619/echo-self

## Stack
- **Frontend:** Next.js 15 (App Router) + shadcn/ui + Tailwind CSS + Framer Motion
- **Mobile:** Expo (React Native)
- **Backend:** Supabase (Auth, Postgres, Edge Functions, Storage)
- **AI:** Anthropic Claude (claude-sonnet-4-6, claude-haiku-4-5) + OpenAI (gpt-4o, embeddings, Whisper)
- **Monorepo:** pnpm workspaces + Turborepo
- **Hosting:** Vercel (web) + EAS (mobile)
- **Analytics:** PostHog + Sentry

## Coding Conventions
- TypeScript strict mode everywhere
- Use `@echo/shared` types — never redefine types that exist there
- Supabase client: use `lib/supabase/server.ts` in Server Components, `lib/supabase/client.ts` in Client Components
- Data fetching: TanStack Query on client, server actions / RSC on server
- Forms: React Hook Form + Zod
- State: Zustand for client UI state only
- All AI calls go through Supabase Edge Functions — never call AI APIs directly from the frontend
- RLS is enforced at DB layer — always include `user_id` checks in queries as a second layer of defense

## Design System
- Background: `#0A0B0F` | Surface: `#141620` | Accent: `#7B6CF6` | Warm: `#F6A26C`
- Font display: Geist | Body: Inter | Mono: Geist Mono
- Tailwind classes: use `echo-` prefixed colors (e.g. `bg-echo-surface`, `text-echo-accent`)
- Animations: Framer Motion for memory reveals, CSS for ambient effects

## AI Prompt Policy
- All prompts live in `packages/ai-core/src/prompts/loader.ts`
- Never hardcode prompts inside edge functions
- Use Claude Haiku for classification tasks, Claude Sonnet for generation/reasoning
- Always include a system prompt that grounds responses in user's actual data

## Branch Workflow
- Feature branches from `develop`: `git checkout -b feat/description develop`
- PRs target `develop` (staging), then `develop` → `main` (production)
- Epic branches (epic-01 through epic-06) exist for long-running work

## Key Paths
- Types: `packages/shared/src/types/`
- AI logic: `packages/ai-core/src/`
- DB migrations: `packages/supabase/migrations/`
- Edge functions: `packages/supabase/functions/`
- Web app: `apps/web/`
- Architecture doc: `docs/architecture.md`
