# Eidolon — Runbook

## Emergency Contacts

| Role | Escalation |
|------|-----------|
| On-call engineer | Sentry alert → PagerDuty |
| AI outage | Check Anthropic status page, activate fallback chain |
| DB incident | Supabase support + Firebase console |

---

## Incident Response

### AI Service Degradation
1. Check Anthropic API status
2. Verify Cloudflare Worker error rate in dashboard
3. If Claude down: GPT-4o-mini fallback auto-activates via Workers
4. If all LLMs down: local template mode activates (no AI generation)
5. Update Remote Config flag `ai_mode = "local"` to force local mode for all users

### Database Overload
1. Check Supabase dashboard → Query Performance
2. Identify slow queries via `pg_stat_statements`
3. Scale read replicas if needed
4. Enable Firestore offline mode as cache layer

### App Store / Play Store Rejection
1. Read rejection reason carefully
2. Check `docs/DECISIONS/` for relevant compliance ADRs
3. Do NOT resubmit within 24 hours — review thoroughly first
4. For guideline 4.3: ensure Eidolon behavior is sufficiently distinct per user

---

## Deployment Runbook

### Standard Release (develop → main)
```bash
# 1. Ensure CI passes on develop
# 2. Create PR: develop → main
# 3. Get 2 approvals
# 4. Merge → triggers CD workflows automatically
# 5. Monitor Sentry for 30 min post-deploy
# 6. Check Mixpanel for anomalies in D1 funnel
```

### Hotfix
```bash
git checkout main
git checkout -b hotfix/description
# fix, test, commit
git push origin hotfix/description
# PR → main (requires 1 approval for hotfix)
# After merge, cherry-pick to develop:
git checkout develop
git cherry-pick <commit-sha>
```

### Rollback Firebase Functions
```bash
firebase functions:delete <function-name> --force
# Then redeploy previous version from git tag
git checkout <previous-tag>
cd backend/functions && npm run deploy
```

### Rollback Supabase Migration
```bash
supabase db reset --linked  # WARNING: destructive on staging only
# For production: write a new migration that reverts the change
```

---

## Monitoring Checklist (Daily)

- [ ] Sentry error rate < 0.5%
- [ ] Firebase Crashlytics crash-free > 99.5%
- [ ] AI API success rate > 99.9% (Cloudflare Worker analytics)
- [ ] D1 retention funnel in Mixpanel
- [ ] Revenue dashboard in RevenueCat
- [ ] Supabase query performance (p99 < 500ms)

---

## Secret Rotation

All secrets stored in GitHub Actions Secrets + Supabase Vault + Firebase Secret Manager.

| Secret | Rotation Period | Owner |
|--------|----------------|-------|
| Anthropic API key | 90 days | Backend team |
| OpenAI API key | 90 days | Backend team |
| Firebase service account | 1 year | DevOps |
| App Store Connect key | As needed | iOS lead |
| Android keystore | Do not rotate (use key alias) | Android lead |
