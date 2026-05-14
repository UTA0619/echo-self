# Contributing to ECHO//SELF

This document defines the engineering standards, workflows, and expectations for contributing to ECHO//SELF. We operate at startup speed with enterprise-grade quality.

---

## Engineering Philosophy

- **Ship fast, but never break trust.** This app holds intimate personal data. Speed matters. Correctness matters more.
- **Every line of code is a product decision.** Think about the user first.
- **Clarity over cleverness.** Simple, readable code ships faster and breaks less.
- **AI-native development.** Use AI agents aggressively for boilerplate, but own every line you commit.

---

## Branch Strategy

```
main          ← production-ready only. Protected. Requires 1 approval.
staging       ← pre-production integration
feature/*     ← feature branches (e.g. feature/ai-memory-retrieval)
fix/*         ← bug fixes (e.g. fix/embedding-timeout)
infra/*       ← infrastructure changes (e.g. infra/supabase-rls-policies)
chore/*       ← non-feature work (e.g. chore/update-dependencies)
```

**Rules:**
- Never commit directly to `main` or `staging`
- Branch from `main` unless building on a WIP feature
- Delete feature branches after merge

---

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code restructure, no behavior change |
| `style` | Formatting, no logic change |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Build, deps, config |
| `ci` | CI/CD changes |

**Scopes:** `auth`, `ai`, `db`, `memory`, `identity`, `notification`, `payment`, `ui`, `infra`, `analytics`

**Examples:**
```
feat(ai): add emotional analysis to journal entry processing
fix(auth): resolve token refresh race condition on iOS
perf(db): add index on user_memories.created_at for faster retrieval
feat(payment): implement Stripe webhook signature verification
```

---

## Pull Request Process

### Before Opening a PR

- [ ] Branch is up to date with `main`
- [ ] All tests pass locally (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No lint errors (`npm run lint`)
- [ ] Supabase RLS policies tested for new tables
- [ ] Environment variables documented in `.env.example` if new ones added
- [ ] Feature works in Supabase local dev environment

### PR Requirements

1. **Use the PR template** — fill every section
2. **Minimum 1 reviewer** — tag the relevant team area (AI, infra, UI)
3. **Link the GitHub issue** — `Closes #123`
4. **Screenshots/recordings** for any UI changes
5. **AI task context** for any changes to prompt logic or embedding pipeline

### PR Size Guidelines

| Size | Lines Changed | Guidance |
|---|---|---|
| XS | < 50 | Ideal. Ship fast. |
| S | 50–200 | Good. Normal feature work. |
| M | 200–500 | Acceptable. Consider splitting. |
| L | 500–1000 | Needs justification. Split if possible. |
| XL | > 1000 | Only for migrations or major refactors. Discuss first. |

### Review SLA

- **Critical/P0:** 2 hours
- **Standard:** 24 hours
- **Chore/Docs:** 48 hours

---

## Code Style

### TypeScript

- Strict mode enabled (`"strict": true` in tsconfig)
- No `any` types without explicit comment justification
- Prefer `interface` over `type` for object shapes
- Use `zod` for runtime validation at API boundaries
- Async/await over raw Promises

### React

- Functional components only
- Custom hooks for any stateful logic > 10 lines
- `useMemo` / `useCallback` only when profiling proves benefit
- Framer Motion for all animations — no raw CSS transitions

### Supabase

- Every table has Row Level Security enabled
- Test RLS policies for both authenticated and anonymous users
- Use typed Supabase client (`supabase-js` with generated types)
- Edge functions use Deno-compatible imports

### AI / OpenAI

- All prompts stored in `src/lib/prompts/` as versioned constants — never inline
- Log prompt inputs and outputs in development (`OPENAI_DEBUG=true`)
- Every OpenAI call has a timeout and fallback behavior
- Embedding calls are batched — never call `embeddings.create` per-row in a loop

---

## Testing Standards

### Required Test Coverage

| Layer | Tool | Minimum Coverage |
|---|---|---|
| Unit (utils, hooks) | Vitest | 80% |
| Integration (Supabase) | Vitest + Supabase local | Critical paths |
| E2E | Playwright | Core user journeys |
| AI | Manual + eval harness | Prompt regression |

### Running Tests

```bash
npm test                # Unit tests (watch mode)
npm run test:coverage   # Coverage report
npm run test:e2e        # Playwright E2E
npm run test:supabase   # Supabase integration tests
```

### Writing Tests

- Test behavior, not implementation
- Use factories for test data (see `src/test/factories/`)
- Mock OpenAI in unit tests — use real calls only in AI eval harness
- E2E tests run against local Supabase — never against production

---

## Database Migration Standards

All schema changes go through versioned Supabase migrations.

```bash
# Create a new migration
npx supabase migration new <description>

# Apply locally
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --local > src/types/supabase.ts
```

**Migration rules:**
- Never modify existing migration files — always create new ones
- Include rollback-safe operations (avoid destructive column drops in same migration)
- RLS policies are part of the migration, not separate scripts
- Test migrations against a database with realistic data volumes

---

## AI Prompt Versioning

Every prompt change is treated like a code change:

1. Update the prompt in `src/lib/prompts/`
2. Increment the prompt version constant
3. Run the eval harness: `npm run eval:prompts`
4. Include eval results in the PR description
5. Tag PR with `ai` label

---

## Environment Variables

Never commit secrets. Never hardcode API keys.

- Add all new variables to `.env.example` with a description
- Use `NEXT_PUBLIC_` prefix only for values safe to expose to the browser
- Document security classification (public, private, secret) in `.env.example`

---

## Security Requirements

- Input validation on every API route using `zod`
- Sanitize user content before AI processing (strip PII patterns)
- Use Supabase RLS — never filter at application level alone
- HTTPS everywhere — no HTTP fallbacks
- Rate limit all AI endpoints
- Report vulnerabilities to security@echoself.app (see SECURITY.md)

---

## Performance Standards

- First paint < 1.5s on mid-tier mobile
- AI streaming responses start within 800ms
- Database queries < 100ms P99 for read paths
- No N+1 queries — verify with Supabase query explain
- Bundle size budget: < 200KB initial JS

---

## Deployment

See [Deployment Guide](docs/operations/DEPLOYMENT.md) for full workflow.

**Quick reference:**
- Preview deployments auto-generate on every PR (Vercel)
- Staging: merge to `staging` → auto-deploys to staging environment
- Production: merge to `main` → requires manual promotion in Vercel dashboard

---

## Getting Help

- **#engineering** — general technical questions
- **#ai-team** — AI, prompts, embeddings
- **#infra** — Supabase, Vercel, infrastructure
- File a GitHub issue for anything that needs tracking
