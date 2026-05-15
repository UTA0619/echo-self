# ECHO//SELF — Launch Day Operations Runbook

**Version**: 1.0  
**Target**: Production launch on App Store + Google Play  
**Owner**: Engineering + DevOps

---

## Pre-Launch Checklist (T-72h)

### Infrastructure
- [ ] Supabase project on Pro plan with read replicas enabled
- [ ] All 8 edge functions deployed to production Supabase project
  ```bash
  supabase functions deploy --project-ref $SUPABASE_PROJECT_REF_PROD
  ```
- [ ] All 4 database migrations applied and verified
  ```bash
  supabase db push --linked
  ```
- [ ] pgvector IVFFlat index built (`004_pgvector_performance.sql`)
- [ ] `user_emotion_summary` materialized view refreshed
- [ ] Supabase pg_cron jobs configured:
  - `reset_broken_streaks()` → daily 00:05 UTC
  - `refresh_emotion_summary()` → daily 03:00 UTC
  - `update-future-self` edge function → daily 03:00 UTC
  - `ai-push-notifications` edge function → daily 09:00 UTC

### Stripe
- [ ] Stripe products and prices created in production mode
- [ ] Webhook endpoint registered: `https://<project>.supabase.co/functions/v1/stripe-webhook`
- [ ] Webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] STRIPE_WEBHOOK_SECRET set in Supabase function secrets
- [ ] Test webhook delivery with `stripe trigger checkout.session.completed`

### Environment Variables (Supabase Function Secrets)
- [ ] `OPENAI_API_KEY` — GPT-4o + text-embedding-3-large
- [ ] `STRIPE_SECRET_KEY` — Stripe production key
- [ ] `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- [ ] `CRON_SECRET` — Random 32-byte hex for cron endpoint auth
- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — auto-injected

### Expo / Mobile
- [ ] EAS production build successful for iOS + Android
  ```bash
  cd apps/mobile
  eas build --platform all --profile production --non-interactive
  ```
- [ ] Bundle ID / package name matches App Store / Play Console entries
- [ ] `app.json` version bumped and build number incremented
- [ ] Deep link scheme `echoself://` verified on both platforms
- [ ] Push notification entitlement configured (iOS `UserNotifications`)
- [ ] `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set in EAS secrets

### Third-Party Services
- [ ] Sentry project created, DSN added to EAS secrets as `EXPO_PUBLIC_SENTRY_DSN`
- [ ] PostHog project created, API key added as `EXPO_PUBLIC_POSTHOG_KEY`
- [ ] Source maps uploaded to Sentry (via EAS build hook)

---

## Launch Sequence (T-0)

### Step 1 — Database (T-0: 00:00)
```bash
# Final migration run
supabase db push --linked --project-ref $SUPABASE_PROJECT_REF_PROD

# Verify row counts
supabase db execute "SELECT COUNT(*) FROM users;" --project-ref $PROD_REF
```

### Step 2 — Edge Functions (T-0: 00:05)
```bash
supabase functions deploy --project-ref $SUPABASE_PROJECT_REF_PROD

# Smoke test each function
curl -X POST https://<proj>.supabase.co/functions/v1/echo-ai \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"entryId":"test","content":"Hello world","userId":"test"}'
```

### Step 3 — App Store Release (T-0: 00:10)
```bash
# iOS — submit latest build to App Store Review
cd apps/mobile
eas submit --platform ios --profile production --latest

# Android — promote to production track
eas submit --platform android --profile production --latest
```

### Step 4 — Monitor (T+0 to T+4h)
- Watch Sentry dashboard for error spike
- Watch Supabase Edge Function logs: `supabase functions logs --tail`
- Watch PostHog Live Events for onboarding funnel
- Watch Stripe Dashboard for first purchases

---

## Rollback Procedures

### Mobile App Rollback
If a critical bug is found post-launch:
1. EAS: Mark current build as failed in Expo dashboard
2. iOS: Submit previous build via App Store Connect (set phased release to 0%)
3. Android: In Play Console → Production → Roll out previous release
4. For server-side fix: deploy corrected edge function (zero downtime)

### Database Rollback
```bash
# Identify last stable migration
supabase db execute "SELECT * FROM schema_migrations ORDER BY inserted_at DESC LIMIT 5;"

# Roll back a specific migration (must have down migration written)
supabase db execute "-- run down migration SQL here"
```

### Edge Function Rollback
```bash
# Deploy previous function version from git
git checkout <previous-tag> -- supabase/functions/<function-name>/
supabase functions deploy <function-name> --project-ref $PROD_REF
```

---

## Monitoring Dashboards

| System | URL | Alert Threshold |
|--------|-----|----------------|
| Sentry Errors | `https://sentry.io/organizations/echoself/` | > 1% error rate |
| PostHog Onboarding | `https://app.posthog.com` → Funnels | < 60% completion |
| Supabase DB | `https://app.supabase.com/project/<ref>/database` | > 80% pool usage |
| Stripe Revenue | `https://dashboard.stripe.com` | MRR target |
| Expo Crash Rate | `https://expo.dev/accounts/<team>/projects/echo-self` | > 0.5% crash rate |

---

## On-Call Contacts

| Role | Responsibility |
|------|---------------|
| Backend Lead | Supabase + edge functions + DB |
| Mobile Lead | Expo + EAS + store submissions |
| DevOps | Cron jobs + infrastructure |
| Product | App Store review escalation |

---

## Post-Launch Tasks (T+24h)

- [ ] Verify push notification delivery (check `notifications` table vs Expo logs)
- [ ] Run `reset_broken_streaks()` manually to confirm cron is working
- [ ] Review first 100 journal entries for quality (no PII logged)
- [ ] Check Stripe `subscriptions` table for first conversions
- [ ] Refresh `user_emotion_summary` materialized view
- [ ] Create PostHog cohort: "Day 1 retained users"
- [ ] Close GitHub Issues #26, #47, #48 when stores confirm listing is live
