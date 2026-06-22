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

## Overnight Autonomous Runs (真の留守番) — Activation

The "while you sleep" engine: a nightly `pg_cron` job calls the `overnight-simulate`
Edge Function, which adventures every Eidolon and writes one `overnight_runs` row that
the app surfaces as a Morning Report. The same function also serves an on-demand mode
(JWT) so a player can tap **送り出す / Send off** on the home screen and get a report
immediately — wired client-side via `MorningReportNotifier.simulateNow()`.

All the code ships in the repo; these are the **environment steps** (run once per
environment — values live in Supabase, never in git):

```bash
# 1. Apply the schema + cron job (migration 011) and the RLS write policies (016)
#    — via the Supabase SQL Editor or the CLI, same as prior migrations.
supabase db push            # or paste 011_overnight_runs.sql + 016_*.sql into SQL Editor

# 2. Deploy the Edge Function
supabase functions deploy overnight-simulate --use-api

# 3. Give the function its secrets (Anthropic key drives generation; the cron
#    secret authenticates the nightly POST; OpenAI is the fallback chain).
supabase secrets set ANTHROPIC_API_KEY=<key> OPENAI_API_KEY=<key> CRON_SECRET=<random>

# 4. Tell Postgres where to POST and which secret to send (read by
#    trigger_overnight_simulation() — MUST match CRON_SECRET from step 3).
#    Run in the SQL Editor:
#      alter database postgres set app.settings.edge_base_url = 'https://<ref>.supabase.co/functions/v1';
#      alter database postgres set app.settings.cron_secret   = '<same random as CRON_SECRET>';
```

**Verify:**
- On-demand: open the app with an awakened Eidolon → home shows the 🌙 *Tonight's
  venture* card → tap **送り出す / Send off** → a Morning Report appears within a few seconds.
- Cron: `select * from cron.job where jobname = 'overnight-simulation';` (should be
  scheduled `0 5 * * *`); after a fire, `select count(*) from overnight_runs where run_date = current_date;`
- Manual fire (no waiting for 05:00 UTC): `select public.trigger_overnight_simulation();`

**Cost control:** generation model is tier-based (`cognitionModelForTier`) — payers get
Sonnet, free users Haiku — so the nightly fan-out spends heavy compute on payers. The
on-demand path is idempotent per Eidolon per UTC day, so repeated taps cost nothing extra.

**Gotchas:**
- If `app.settings.edge_base_url` / `cron_secret` are unset, the cron logs a notice and
  no-ops (no error) — reports simply never appear. Check `cron.job_run_details`.
- The dispatch card is hidden once a run exists for today (`hasRunToday()`), so it won't
  step on the cron or double-charge.

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
