# Eidolon — The Soul-Bound RPG

> "Your AI soul-twin keeps adventuring while you sleep."

Eidolon is the world's first RPG combining AI-generated dungeons, reality-linked gameplay,
AI companions, and asynchronous multiplayer — for iOS, Android, and Web (PWA).

## Architecture

| Layer | Technology |
|-------|-----------|
| Mobile / Web | Flutter 3.27+ / Flame Engine 1.20+ |
| State | Riverpod 2.5+ |
| Backend | Firebase + Supabase + Cloudflare Workers |
| AI | Claude Sonnet 4.5 / Haiku 4.5 / GPT-4o-mini |
| Analytics | Mixpanel + GameAnalytics + AppsFlyer |
| Monitoring | Sentry + Crashlytics |

## Repository Structure

```
eidolon/
├── apps/mobile/          # Flutter app (iOS / Android / Web)
├── apps/admin/           # Internal admin dashboard
├── backend/functions/    # Firebase Cloud Functions (TypeScript)
├── backend/supabase/     # Supabase migrations + Edge Functions
├── packages/shared_types # Shared Dart/TS type definitions
├── packages/game_logic   # Core game engine logic
├── packages/design_system# UI component library
└── docs/                 # GDD, Architecture, API docs, ADRs
```

## Getting Started

### Prerequisites

- Flutter 3.27+ / Dart 3.6+
- Node.js 20+
- Firebase CLI
- Supabase CLI
- Melos (Dart monorepo tooling)

### Setup

```bash
# Install Melos globally
dart pub global activate melos

# Bootstrap all packages
melos bootstrap

# Run the mobile app
cd apps/mobile && flutter run
```

## Success Metrics

| KPI | Target |
|-----|--------|
| Monthly Revenue | ≥ $40,000 |
| MAU | ≥ 25,000 |
| D1 Retention | ≥ 55% |
| D7 Retention | ≥ 30% |
| D30 Retention | ≥ 18% |
| App Store Rating | ≥ 4.5★ |
| Crash-Free Sessions | ≥ 99.5% |

## License

Proprietary — All Rights Reserved. See [LICENSE](./LICENSE).
