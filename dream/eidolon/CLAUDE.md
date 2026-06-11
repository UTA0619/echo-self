# Eidolon — Claude Code Context

## Project
Eidolon is a soul-bound RPG combining AI dungeons, reality-linked gameplay, AI companions,
and async multiplayer. Target: $40K/month revenue at 25K MAU within 24 months.

## Stack
- **Mobile/Web:** Flutter 3.27+ / Flame Engine 1.20+ / Riverpod 2.5+ / GoRouter 14+
- **Backend:** Firebase (Auth/Firestore/Functions/Storage) + Supabase (Postgres/pgvector/Edge) + Cloudflare Workers
- **AI:** Claude Sonnet 4.5 (story gen) / Claude Haiku 4.5 (events/dialogue) / GPT-4o-mini (fallback)
- **Monetization:** RevenueCat + Mixpanel + GameAnalytics + AppsFlyer
- **DevOps:** GitHub Actions + Codemagic + Fastlane + Sentry

## Key Paths
- Flutter app: `apps/mobile/lib/`
- Features: `apps/mobile/lib/features/<name>/` (Clean Architecture)
- Game engine: `apps/mobile/lib/game/`
- Cloud Functions: `backend/functions/src/`
- Supabase: `backend/supabase/`
- Shared Dart types: `packages/shared_types/`
- Game logic package: `packages/game_logic/`
- Design system: `packages/design_system/`
- Docs / ADRs: `docs/DECISIONS/`

## Coding Conventions
- TypeScript strict mode for all backend code
- Dart: `dart format` + `flutter analyze` zero warnings
- No widget > 300 lines; split into sub-widgets
- Riverpod for ALL state — never `setState`
- `Result<T, E>` for error handling in domain layer
- i18n from day one — all strings in `lib/i18n/*.arb`
- AI calls only through Supabase Edge Functions or Cloudflare Workers — never direct from client
- Never commit secrets; use `--dart-define-from-file` for Dart env

## Feature Folder Structure (Clean Architecture)
```
features/<name>/
├── data/datasources/
├── data/models/
├── data/repositories/
├── domain/entities/
├── domain/repositories/
├── domain/usecases/
├── presentation/pages/
├── presentation/widgets/
├── presentation/providers/
└── <name>.dart
```

## LLM Prompt Policy
- All prompts live in `backend/functions/src/llm/prompts/`
- Claude Haiku for classification (tags, emotion) — low latency
- Claude Sonnet for generation/reasoning — high quality
- Always include Big Five personality + recent memories in Eidolon prompts
- Fallback chain: Claude → GPT-4o-mini → local template

## Branch Workflow
- `main` — production (protected)
- `develop` — staging integration
- Feature branches: `feat/description` from `develop`
- PRs target `develop`

## Quality Gates
- Unit test coverage ≥ 80%
- Startup < 3s / 60fps / Memory < 200MB
- Crash-Free Sessions > 99.5%
- Lighthouse PWA ≥ 95
