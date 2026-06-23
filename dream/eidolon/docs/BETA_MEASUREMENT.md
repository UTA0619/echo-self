# Beta Measurement Playbook — Retention & Viral K

The single question this answers: **do real users come back, and do they bring
others?** Everything else (more features, polish) is premature until these two
numbers are known. This is the go/no-go gate before investing further.

---

## What we measure

| Metric | Definition | Why it decides everything |
|--------|-----------|---------------------------|
| **D1 / D7 / D30 retention** | % of activated users who open the app 1 / 7 / 30 days after activating | Habit = the only durable moat for a companion app |
| **Activation rate** | % of installs that finish onboarding (`eidolon_awakened`) | A leaky funnel makes retention unreadable |
| **Morning-return** | % who open a Morning Report the day after a run | Proves the "living twin" loop is the hook |
| **Viral K** | (shares per user) × (installs per share) | K > ~0.5 = a real growth engine; K ≈ 0 = paid-UA only |

---

## Instrumented events (already in the app)

Fire only when `MIXPANEL_TOKEN` is set (no-op otherwise — demo/tests stay clean).
Source: `lib/core/analytics/analytics.dart`.

| Event | When | Funnel role |
|-------|------|-------------|
| `app_opened` (+ `daypart`, `cold_start`) | every foreground; `identify(uid)` on auth | **retention cohorts** |
| `eidolon_awakened` (+ `answered`) | onboarding completes | **activation anchor** |
| `morning_report_viewed` | opens a Morning Report | morning-return habit |
| `overnight_dispatch_tapped` | taps 送り出す | daily-active loop |
| `morning_share_initiated` → `morning_share_completed` | share flow | **viral K (share side)** |

Shared links carry `inviteLink(uid)` = `https://eidolon.app/i?r=<referralCode>`.

---

## Step 1 — Mixpanel

1. Create a Mixpanel project → copy the **Project Token**.
2. Put it in your env file (NOT committed):
   ```jsonc
   // .env.development.json  (and a .env.production.json for the real build)
   "MIXPANEL_TOKEN": "<your token>"
   ```
   `AppEnv.mixpanelToken` reads it via `--dart-define-from-file`. Done — no code change.
3. (One-time, in Mixpanel) mark `eidolon_awakened` as the **first event** for a
   retention report so cohorts anchor on activation, not raw install.

---

## Step 2 — Ship a beta build

```bash
# iOS (TestFlight) — uses the FVM-pinned Flutter
fvm flutter build ipa --release --dart-define-from-file=.env.production.json
# → upload build/ios/ipa/*.ipa via Transporter or `xcrun altool`, add to TestFlight

# Android (Play internal testing)
fvm flutter build appbundle --release --dart-define-from-file=.env.production.json
# → upload the .aab to the Play Console internal track
```
Backend must be live first (Supabase URL/anon key in the env file; overnight
cron deployed per `RUNBOOK.md`). Without real Supabase creds the app boots into
DEMO mode and no events are real.

---

## Step 3 — Recruit 50–100 users

- The bar is small on purpose: 50–100 real users is enough to read D1/D7 and a
  first K signal. Don't scale spend before the numbers say "go".
- Sources: friends/communities/Discord/Reddit/X — anywhere the "your AI twin
  adventures while you sleep" hook resonates. Avoid incentivized installs (they
  poison retention).

---

## Step 4 — Read the numbers (Mixpanel)

- **Retention report**: cohort on `eidolon_awakened`, returning event
  `app_opened`. Read D1, D7, D30.
- **Morning-return**: retention with returning event `morning_report_viewed`,
  or a `daypart = morning` filter on `app_opened`.
- **Activation funnel**: `app_opened` (first) → `eidolon_awakened`.
- **Viral K (share side)**: `morning_share_completed` count ÷ activated users =
  shares/user. Install side needs Step 5.

---

## Go / No-Go criteria

These are the consumer-social benchmarks to judge against (not WCAG-style
absolutes — directional):

| Signal | 🟢 Promising | 🟡 Fixable | 🔴 Rethink the hook |
|--------|-------------|-----------|---------------------|
| D1 | ≥ 40% | 25–40% | < 25% |
| D7 | ≥ 20% | 10–20% | < 10% |
| D30 | ≥ 10% | 4–10% | < 4% |
| Activation | ≥ 60% | 40–60% | < 40% |
| K (with install attribution) | ≥ 0.5 | 0.2–0.5 | < 0.2 |

**Decision rule:** if D7/D30 land 🔴, *do not* build more features — change the
core loop or the hook. If 🟢, that's the signal that justifies a team + capital.

---

## Step 5 — Full viral K (install attribution) — the remaining gap

The share side is instrumented; the **install side is not**, because attributing
an install back to a referral code needs infrastructure (your accounts/domain):

- **Deferred deep links** via AppsFlyer or Branch (AppsFlyer is already in the
  stack list but unwired) — gives true share→install→`referred_install` linkage.
- **Or** an `eidolon.app/i` landing page that forwards to the store while
  preserving `?r=<code>` (Play Install Referrer on Android; a first-run code
  prompt on iOS).

Until then, K is measurable only on the share side (shares/user) — a useful
upper-bound proxy. Wiring full attribution is a focused follow-up once the
retention gate is green.
