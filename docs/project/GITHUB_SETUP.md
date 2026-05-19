# GitHub Project Setup Guide — ECHO//SELF

Complete guide for setting up the GitHub project board, labels, milestones, and automation.

---

## Labels

Run these `gh` commands to create all labels. Delete defaults first.

```bash
# Delete default GitHub labels
gh label delete "bug" --yes
gh label delete "documentation" --yes
gh label delete "duplicate" --yes
gh label delete "enhancement" --yes
gh label delete "good first issue" --yes
gh label delete "help wanted" --yes
gh label delete "invalid" --yes
gh label delete "question" --yes
gh label delete "wontfix" --yes

# ── Type Labels ─────────────────────────────────────────────────
gh label create "bug"           --color "D73A4A" --description "Something is broken"
gh label create "enhancement"   --color "A2EEEF" --description "New feature or improvement"
gh label create "epic"          --color "7057FF" --description "Large multi-sprint initiative"
gh label create "task"          --color "E4E669" --description "Engineering task or chore"
gh label create "spike"         --color "FEF2C0" --description "Research or investigation"
gh label create "docs"          --color "0075CA" --description "Documentation only"

# ── Priority Labels ──────────────────────────────────────────────
gh label create "P0 - Critical" --color "B60205" --description "Emergency — address immediately"
gh label create "P1 - High"     --color "E11D48" --description "High priority — current sprint"
gh label create "P2 - Medium"   --color "F97316" --description "Medium priority — planned"
gh label create "P3 - Low"      --color "FCD34D" --description "Low priority — backlog"

# ── Domain Labels ────────────────────────────────────────────────
gh label create "frontend"      --color "F9A8D4" --description "React UI, components, screens"
gh label create "backend"       --color "93C5FD" --description "API routes, server logic"
gh label create "ai"            --color "C4B5FD" --description "AI, prompts, embeddings, ML"
gh label create "database"      --color "6EE7B7" --description "Schema, migrations, RLS, queries"
gh label create "infra"         --color "FCD34D" --description "Deployment, CI/CD, infrastructure"
gh label create "mobile"        --color "F472B6" --description "Mobile-specific (iOS/Android)"
gh label create "ui/ux"         --color "FDE68A" --description "Design, motion, UX"
gh label create "notifications" --color "A3E635" --description "Push notifications, OneSignal"
gh label create "analytics"     --color "67E8F9" --description "PostHog, tracking, events"
gh label create "payments"      --color "4ADE80" --description "Stripe, subscriptions, billing"
gh label create "auth"          --color "FB923C" --description "Authentication, sessions, security"
gh label create "realtime"      --color "38BDF8" --description "Supabase Realtime, websockets"

# ── Status Labels ────────────────────────────────────────────────
gh label create "needs-triage"  --color "EDEDED" --description "Needs review and prioritization"
gh label create "needs-design"  --color "F9A8D4" --description "Waiting on design/Figma"
gh label create "blocked"       --color "B60205" --description "Blocked by dependency"
gh label create "in-review"     --color "0052CC" --description "PR open, under review"

# ── Product Labels ───────────────────────────────────────────────
gh label create "onboarding"    --color "BFDBFE" --description "User onboarding flow"
gh label create "retention"     --color "BBF7D0" --description "Retention mechanics"
gh label create "viral-loop"    --color "FDE68A" --description "Viral growth mechanics"
gh label create "monetization"  --color "4ADE80" --description "Revenue and paywall"
gh label create "performance"   --color "FCA5A5" --description "Speed, load time, optimization"
gh label create "security"      --color "D73A4A" --description "Security vulnerability or improvement"

# ── Quality Labels ───────────────────────────────────────────────
gh label create "critical"      --color "B60205" --description "Critical severity"
gh label create "regression"    --color "D73A4A" --description "Regression from previous working state"
gh label create "technical-debt"--color "E4E669" --description "Code quality, refactoring"

# ── Story Point Labels ───────────────────────────────────────────
gh label create "1pt"  --color "F0FDF4" --description "1 story point — trivial"
gh label create "2pts" --color "DCFCE7" --description "2 story points — small"
gh label create "3pts" --color "BBF7D0" --description "3 story points — medium"
gh label create "5pts" --color "86EFAC" --description "5 story points — large"
gh label create "8pts" --color "4ADE80" --description "8 story points — XL"
```

---

## Milestones

```bash
gh milestone create "M0: Foundation" \
  --description "Auth, DB schema, CI/CD, core project structure" \
  --due-date "2026-05-28"

gh milestone create "M1: Core Loop" \
  --description "Journal → AI → Memory → Insight pipeline fully functional" \
  --due-date "2026-06-18"

gh milestone create "M2: Identity Engine" \
  --description "Identity graph, emotional analysis engine, future self predictions" \
  --due-date "2026-07-16"

gh milestone create "M3: Monetization" \
  --description "Stripe subscriptions, paywall, free/pro tiers, trial" \
  --due-date "2026-08-06"

gh milestone create "M4: Growth" \
  --description "Viral referral loops, streak notifications, engagement mechanics" \
  --due-date "2026-08-27"

gh milestone create "M5: App Store" \
  --description "iOS + Android submissions, App Store + Google Play review" \
  --due-date "2026-09-17"

gh milestone create "M6: Scale" \
  --description "10k MAU readiness, performance hardening, cost optimization" \
  --due-date "2026-11-05"
```

---

## GitHub Projects Board

### Create Project

```bash
# Create project board
gh project create \
  --owner "@me" \
  --title "ECHO//SELF — Engineering Board" \
  --format board
```

### Board Columns (create in this order)

| Column | Description | WIP Limit |
|---|---|---|
| **Backlog** | Groomed, estimated, not yet scheduled | — |
| **Ready** | Scheduled for current/next sprint | — |
| **In Progress** | Actively being worked | 3 |
| **Review** | PR open, awaiting review | — |
| **Testing** | QA / UAT / smoke tests | — |
| **Blocked** | Waiting on dependency or decision | — |
| **Done** | Shipped to production | — |

### Board Views to Configure

1. **Sprint View** — Filter by current sprint label, group by assignee
2. **Epic View** — Group by epic label, show story points
3. **Priority View** — Sort by P0→P3 labels
4. **AI View** — Filter by `ai` label, show prompt version field
5. **Backlog View** — All items, sorted by priority + story points

### Custom Fields to Add

| Field | Type | Options |
|---|---|---|
| Story Points | Number | 1, 2, 3, 5, 8, 13 |
| Sprint | Select | Sprint 1, Sprint 2, ... Sprint 12 |
| Estimated Hours | Number | — |
| Prompt Version | Text | — (AI issues only) |
| Epic | Select | All epic names |

---

## Automation Rules

Set these up in GitHub Projects → Workflow Automation:

| Trigger | Action |
|---|---|
| Issue opened | Add to Backlog |
| PR opened | Move linked issue to Review |
| PR merged | Move linked issue to Done |
| Issue assigned | Move to In Progress |
| PR review requested | Keep in Review |
| PR changes requested | Move to In Progress |

---

## Sprint Labels

Create sprint labels for tracking:

```bash
for i in $(seq 1 12); do
  gh label create "Sprint $i" \
    --color "DBEAFE" \
    --description "Sprint $i work items"
done
```

---

## Issue Pinning

Pin these permanent issues to the top of the issues list:
1. **[EPIC] Foundation & Infrastructure** — links to M0 issues
2. **[EPIC] AI Memory & Identity Engine** — links to M1/M2 issues
3. **[EPIC] Monetization & Growth** — links to M3/M4 issues
4. **[EPIC] App Store Launch** — links to M5 issues

---

## GitHub Actions Secrets to Configure

Set these in **Settings → Secrets and variables → Actions**:

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_URL_PREVIEW
SUPABASE_DB_URL_PRODUCTION
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_POSTHOG_KEY
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
CODECOV_TOKEN
TEST_USER_EMAIL
TEST_USER_PASSWORD
PROD_SMOKE_TEST_USER_EMAIL
PROD_SMOKE_TEST_USER_PASSWORD
```
