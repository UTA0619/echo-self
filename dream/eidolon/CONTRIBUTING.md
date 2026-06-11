# Contributing to Eidolon

## Branch Workflow

```
main        ← production (protected, requires 2 approvals)
develop     ← staging integration
feat/*      ← feature branches (from develop)
fix/*       ← bug fixes (from develop)
hotfix/*    ← critical fixes (from main)
```

All PRs target `develop`. After QA on staging, `develop` → `main`.

## Commit Convention

```
feat(scope): short description
fix(scope): short description
refactor(scope): short description
test(scope): short description
docs(scope): short description
chore(scope): short description
```

Scopes: `eidolon`, `dungeon`, `reality`, `social`, `monetize`, `llm`, `auth`, `core`, `ci`

## PR Checklist

- [ ] Tests added / updated (coverage ≥ 80%)
- [ ] No performance regression (60fps / startup < 3s)
- [ ] Accessibility verified (screen reader, contrast)
- [ ] i18n: all user-facing strings use arb keys
- [ ] No API keys or secrets in code
- [ ] ADR written for architecture decisions
- [ ] Documentation updated
- [ ] Self-review score ≥ 95/100

## Code Standards

- **Dart:** `flutter analyze` must pass with zero warnings
- **TypeScript:** `eslint` + `tsc --noEmit` must pass
- **Formatting:** `dart format` / `prettier` (enforced by CI)
- **Widget size:** No widget file > 300 lines
- **State:** Riverpod only — no `setState`
- **Error handling:** `Result<T, E>` pattern — no raw `try/catch` returns

## ADR Process

For any architecture decision:
1. Copy `docs/DECISIONS/ADR-000-template.md`
2. Fill in context, options, decision, consequences
3. Number sequentially (ADR-001, ADR-002, ...)
4. Submit as part of the PR that implements the decision
