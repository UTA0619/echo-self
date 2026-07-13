# ECHO//SELF — Release Checklist (Web)

Everything that can be done in code is done. What remains needs *your* accounts
and credentials. Work top-to-bottom.

## Status

| Layer | State |
|-------|-------|
| Schema (auth-id model) | ✅ merged (#128), verified end-to-end |
| Edge-function column audit | ✅ all 19 functions satisfied |
| App production build | ✅ `next build` passes (35 routes) |
| Cron routes (daily insight, streak reminders, future-self) | ✅ implemented (`apps/web/app/api/cron/*`) |
| Deploy config (`vercel.json`, `.env.example`) | ✅ in place |
| Live backend provisioning | ⬜ **you** |
| Secrets | ⬜ **you** |
| Vercel deploy | ⬜ **you** |
| Smoke test | ⬜ (I can drive once the above are done) |

## 1. Apply the schema to the live Supabase project

The linked project is pre-launch, so a clean reset is correct:

```bash
supabase link --project-ref mnmfcodlsybphrpnyjfg   # if not already linked
supabase db reset --linked                          # applies migrations + seed
```

> Do NOT use `supabase db push` here — the stale migration versions may already
> be recorded in the remote migration history. `reset` gives a clean, correct DB.

## 2. Set secrets

**Vercel** (Project → Settings → Environment Variables) — from `.env.example`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`  *(server only)*
- `NEXT_PUBLIC_APP_URL` (e.g. `https://echo-self.app`)
- `CRON_SECRET` (any long random string — Vercel Cron sends it as the bearer)
- Stripe / PostHog / Sentry keys as needed

**Supabase Edge Functions** (these call the AI providers directly):
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy   # deploy all edge functions
```

## 3. Deploy the web app

Root Directory = `apps/web` in Vercel project settings. Then:
```bash
vercel --prod
```
`vercel.json` (repo root) wires the 3 cron jobs and API security headers.

## 4. Smoke test (I can drive this)

1. Sign up → confirm `users` + `profiles` rows auto-create (signup trigger).
2. Complete onboarding → `identity_traits` seeded, `profiles.onboarding_done = true`.
3. Write an entry → within a few seconds an ECHO reflection appears (Realtime).
4. Check `/identity`, `/future-self`, `/search`.
5. Trigger a cron manually: `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/generate-daily-insight`.

## Known follow-ups (not launch-blocking)

- 3 cron jobs were declared in `vercel.json` with no implementation and were
  removed: `process-memory-embeddings`, `cleanup-expired-sessions`,
  `billing-usage-sync`. Add routes + edge functions if/when needed.
- `apps/web/driver-copilot/` is a stray 1.1 GB nested repo with **unpushed
  commits** — excluded from git/Vercel via ignore files. Relocate it out of
  `apps/web`; do not delete before pushing its work.
- Mobile (Expo) App Store steps: see the StoreKit/RevenueCat setup — Apple
  Developer Program, App Store Connect products, EAS build, screenshots.
