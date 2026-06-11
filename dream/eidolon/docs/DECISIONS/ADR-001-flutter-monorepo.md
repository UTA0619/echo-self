# ADR-001: Flutter + Melos Monorepo Structure

**Date:** 2026-05-22  
**Status:** Accepted  
**Deciders:** Principal Engineer

---

## Context

Eidolon requires a single codebase targeting iOS, Android, and Web (PWA). We also need
shared code between the mobile app, admin dashboard, and potentially future clients.

## Decision Drivers

- Single codebase for iOS / Android / Web
- Shared game logic and types between packages
- Clear separation of features for parallel development
- Fast CI (incremental builds, only affected packages)

## Options Considered

### Option A: Flutter + Melos Monorepo
- **Pros:** Flutter's cross-platform is mature; Melos handles Dart monorepo tooling well; Flame Engine is Flutter-native; single language (Dart) for client code
- **Cons:** Web performance lags behind native React approaches for non-game UI

### Option B: React Native + Expo (separate from game layer)
- **Pros:** Large ecosystem; strong web support
- **Cons:** Requires bridging to a native game engine; two runtimes; more complexity

### Option C: Unity WebGL / Native
- **Pros:** Best-in-class game tooling
- **Cons:** PWA story is weak; very large binary; harder AI/backend integration; expensive licenses

## Decision

We chose **Option A: Flutter + Melos** because:
1. Flame Engine integrates natively — no bridge layer
2. Dart code can be shared across packages (game_logic, shared_types)
3. Single language reduces context switching
4. Melos provides incremental builds, reducing CI time

## Consequences

### Positive
- One language for all client-side code
- Flame Engine for 2D combat / dungeon rendering
- Melos `--since` flag enables affected-only CI

### Negative / Trade-offs
- Flutter Web performance for complex animations requires `CanvasKit` renderer
- Dart ecosystem smaller than JS for some utility libs

### Risks
- Flutter Web SEO is limited — marketing site should be separate (Next.js or similar)

## Implementation Notes

See `melos.yaml` for workspace configuration.
Packages: `apps/mobile`, `packages/shared_types`, `packages/game_logic`, `packages/design_system`.
