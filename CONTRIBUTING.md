# Contributing to ECHO//SELF

## Getting Started

1. Fork the repository
2. `git checkout -b feature/your-feature-name`
3. Copy `.env.example` → `.env.local` and fill values
4. `pnpm install && pnpm turbo dev`

## Commit Convention

```
feat: add voice input to daily entry
fix: resolve streak reset on timezone edge case
ai: improve echo system prompt emotional mirroring
perf: optimize memory retrieval query with index
docs: add edge function API documentation
test: add E2E test for onboarding flow
chore: upgrade Expo SDK to 51.0.2
```

## Branch Naming

```
feature/[issue-number]-short-description
fix/[issue-number]-bug-description
ai/[issue-number]-prompt-change-description
```

## Code Standards

- TypeScript strict mode — no `any` types
- No `console.log` in production — use `Sentry.captureMessage()`
- All PostHog events documented in `docs/ANALYTICS.md`
- React hooks exhaustive-deps enforced

## Review Process

1. Self-review with PR template checklist
2. All CI checks must pass
3. Squash merge to `develop`

