# Production Deployment Plan — ECHO//SELF

---

## Deployment Architecture

```
Developer → PR → CI (type-check, lint, test, build)
                 ↓
           Preview Deploy (Vercel)
                 ↓
           PR merged to main
                 ↓
           Production Deploy (Vercel)
                 ↓
           Supabase Migrations Run
                 ↓
           Sentry Release Created
                 ↓
           Production Smoke Tests
                 ↓
           Post-Deploy Error Scan (60s)
```

---

## Environment Configuration

| Env | Branch | URL | Supabase | Stripe |
|---|---|---|---|---|
| Local | any | localhost:3000 | local docker | test |
| Preview | feature/* | auto.vercel.app | preview project | test |
| Production | main | echoself.app | production project | live |

---

## Pre-Deploy Checklist

Before merging any PR to `main`:

**Code Quality**
- [ ] All CI checks green (type-check, lint, test, secret-scan, build)
- [ ] Peer review approved (1 required, 2 for infra/DB changes)
- [ ] No `console.log` left in production code
- [ ] No `TODO` or `FIXME` in changed files without linked issue

**Database**
- [ ] Migration files correctly named (`XXX_description.sql`)
- [ ] RLS policies included in migration
- [ ] Migration tested on staging with production-scale data
- [ ] Rollback plan documented in PR description
- [ ] TypeScript types regenerated and committed

**Security**
- [ ] No secrets in diff
- [ ] New API routes have auth middleware
- [ ] New tables have RLS enabled
- [ ] Input validation on all new endpoints (Zod)

**Environment**
- [ ] New env vars added to `.env.example`
- [ ] New env vars set in Vercel production environment
- [ ] Feature flags configured if needed

---

## Deploy Process (Manual Override)

For emergency or manual deploys:

```bash
# 1. Link to Vercel project
vercel link --yes --project echo-self --scope your-team

# 2. Pull production env vars
vercel env pull .env.local --environment=production --yes

# 3. Build
vercel build --prod

# 4. Run migrations
npx supabase db push --db-url "$SUPABASE_DB_URL_PRODUCTION"

# 5. Deploy
DEPLOYMENT_URL=$(vercel deploy --prebuilt --prod)
echo "Deployed: $DEPLOYMENT_URL"

# 6. Create Sentry release
npx @sentry/cli releases new "$GIT_SHA"
npx @sentry/cli releases set-commits "$GIT_SHA" --auto
npx @sentry/cli releases finalize "$GIT_SHA"

# 7. Post-deploy error scan
sleep 60
vercel logs $DEPLOYMENT_URL --level error --since 2m
```

---

## Rollback Procedure

### Immediate Rollback (< 2 minutes)

```bash
# Roll back to previous production deployment instantly (no rebuild)
vercel rollback --token $VERCEL_TOKEN

# Verify rollback
vercel ls --prod
```

### Database Rollback

If a migration caused issues:

```bash
# Apply rollback migration
npx supabase db push supabase/migrations/rollback/XXX_rollback.sql \
  --db-url "$SUPABASE_DB_URL_PRODUCTION"
```

**Note:** Write rollback migrations for any destructive schema change. Test on staging first.

### Feature Flag Kill Switch

If a specific feature is causing issues, disable it via PostHog feature flags (no deploy required):

```
PostHog → Feature Flags → [flag_name] → Roll out to 0%
```

---

## Database Migration Strategy

### Two-Phase Deployments (for breaking changes)

**Phase 1:** Add new column/table (backward compatible)
```sql
ALTER TABLE journal_entries ADD COLUMN new_field TEXT;
```
Deploy application code that writes to both old and new fields.

**Phase 2:** (next deploy) Remove old column
```sql
ALTER TABLE journal_entries DROP COLUMN old_field;
```

Never drop columns and update application code in the same deploy.

### Migration Naming Convention

```
supabase/migrations/
  001_initial_schema.sql
  002_journal.sql
  003_ai_memory.sql
  004_identity.sql
  005_echo.sql
  006_monetization.sql
  007_growth.sql
  008_YYYY_MM_DD_description.sql  (ongoing)
```

---

## Production Environment Variables

Set via Vercel Dashboard or CLI. Full list in `.env.example`.

```bash
# Add/update a production env var
echo "new-value" | vercel env add MY_VAR production --token $VERCEL_TOKEN

# Verify env vars are set
vercel env ls production --token $VERCEL_TOKEN
```

---

## DNS & Domain Configuration (Cloudflare)

- Primary domain: `echoself.app` → Cloudflare proxy → Vercel
- API: `api.echoself.app` → same Vercel deployment (routed in Next.js)
- OG images: `og.echoself.app` → Vercel Edge Function

**Cloudflare settings:**
- Proxy mode: ON (for DDoS protection, caching)
- SSL: Full (Strict)
- HTTP→HTTPS redirect: ON
- Cache everything: OFF for /api/* routes, ON for static assets
- Cache TTL for static: 1 year (with cache-busting via content hash)

---

## Scaling Runbook

**Sign of approaching limits:**
- Supabase connection pool > 80% utilized → enable pgBouncer
- Vercel function cold starts > 2s → increase memory allocation
- OpenAI rate limits hit → implement request queuing
- Embedding latency > 5s → scale to dedicated OpenAI tier

**At 1,000 MAU:**
- Monitor daily; no infrastructure changes needed
- Cost: ~$50–100/month (Supabase Pro + Vercel Pro + OpenAI)

**At 10,000 MAU:**
- Enable Supabase read replicas
- IVFFlat index: rebuild with `lists = 300`
- Vercel: verify Fluid Compute is enabled (handles concurrency)
- OpenAI: move to Tier 2 rate limits ($500+ spend history)
- Cost: ~$500–1,000/month

**At 100,000 MAU:**
- Shard embeddings by user cohort
- Dedicated OpenAI Enterprise agreement
- Supabase Enterprise for SLA + dedicated compute
- Cloudflare Workers for edge caching of identity graphs
- Cost: ~$5,000–15,000/month
