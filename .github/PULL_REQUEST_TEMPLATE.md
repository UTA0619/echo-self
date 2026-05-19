## Summary

<!-- 1-3 bullets describing WHAT changed and WHY -->
-
-

Closes #<!-- Issue number -->

---

## Type of Change

- [ ] `feat` — New feature
- [ ] `fix` — Bug fix
- [ ] `perf` — Performance improvement
- [ ] `refactor` — Code restructure (no behavior change)
- [ ] `style` — Formatting only
- [ ] `test` — Tests only
- [ ] `docs` — Documentation only
- [ ] `chore` — Build, deps, config
- [ ] `ci` — CI/CD changes
- [ ] `infra` — Infrastructure (Supabase, Vercel, Cloudflare)
- [ ] `ai` — AI/prompt changes

---

## Scope

- [ ] `auth` — Authentication / sessions
- [ ] `ai` — AI processing, prompts, embeddings
- [ ] `db` — Database schema, migrations, RLS
- [ ] `memory` — AI memory system
- [ ] `identity` — Identity graph / future self engine
- [ ] `notification` — Push notification system
- [ ] `payment` — Stripe / subscription
- [ ] `ui` — UI components, animations
- [ ] `analytics` — Tracking, PostHog
- [ ] `infra` — Deployment, CI/CD, config

---

## What Changed

<!-- Detailed description of the change. Include architectural decisions if relevant. -->

---

## AI Changes (complete if `ai` scope)

- [ ] No AI changes in this PR

**If AI changes exist:**

| Field | Details |
|---|---|
| Prompt file(s) changed | `src/lib/prompts/...` |
| Prompt version bumped | From v? to v? |
| Eval harness run? | Yes / No |
| Eval pass rate | ?% |
| Model used | gpt-4o / text-embedding-3-large |
| Token impact | +/- ? tokens per call |

**Eval summary:**
<!-- Paste brief eval results or link to eval run -->

---

## Database Changes (complete if `db` scope)

- [ ] No database changes in this PR

**If DB changes exist:**

- [ ] Migration file created with correct timestamp naming
- [ ] RLS policies included in migration
- [ ] TypeScript types regenerated (`npx supabase gen types typescript`)
- [ ] Migration tested against production-scale data
- [ ] Rollback plan documented below

**Rollback plan:**
<!-- How to undo this migration if needed -->

---

## Testing

### Unit / Integration

- [ ] New tests added for new functionality
- [ ] Existing tests updated to reflect changes
- [ ] All tests pass: `npm test`
- [ ] TypeScript: `npm run type-check` passes
- [ ] Lint: `npm run lint` passes

### Manual Testing

**Device/Platform tested:**
- [ ] iOS (Expo Go / TestFlight)
- [ ] Android (Expo Go)
- [ ] Web (Chrome)
- [ ] Dark mode
- [ ] Reduced motion

**Test scenarios verified:**
<!-- List key scenarios tested -->
-
-

**Edge cases verified:**
<!-- List edge cases considered and tested -->
-

---

## Security Checklist

- [ ] No secrets committed (checked with `git-secrets`)
- [ ] New API routes have JWT validation
- [ ] New DB tables have RLS enabled
- [ ] User input validated with Zod
- [ ] No `NEXT_PUBLIC_` prefix on sensitive values
- [ ] Rate limiting applied to AI/expensive endpoints
- [ ] N/A — No security-relevant changes

---

## Performance

- [ ] No performance impact
- [ ] Performance tested — results: <!-- describe -->
- [ ] Bundle size checked (if frontend change): `npm run analyze`

---

## Screenshots / Recordings

<!-- Required for any UI changes. Drag and drop images or GIFs. -->

| Before | After |
|---|---|
| | |

---

## Deployment Notes

<!-- Anything ops/deployment team needs to know -->

- [ ] No deployment notes
- [ ] Requires new environment variables (documented in `.env.example`)
- [ ] Requires Supabase migration to run: `npx supabase db push`
- [ ] Requires feature flag enabled: `FLAG_NAME`
- [ ] Requires manual step: <!-- describe -->

---

## Reviewer Notes

<!-- Anything specific you want reviewers to focus on -->

---

*By submitting this PR, I confirm this code follows [ECHO//SELF engineering standards](../CONTRIBUTING.md) and I have tested the changes myself.*
