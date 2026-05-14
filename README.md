# ECHO//SELF

> *You are not who you were. You are who you are becoming.*

**ECHO//SELF** is an AI-native identity operating system — a persistent emotional mirror and future-self prediction engine. It learns who you are, remembers everything you've shared, surfaces patterns invisible to you, and projects the version of you that your current trajectory builds toward.

---

## What It Does

- **Emotional Memory** — Captures every journal entry, reflection, and voice note with full emotional context
- **Identity Graph** — Builds a private, evolving model of your values, patterns, fears, and strengths
- **Future Self Engine** — Predicts your 30/90/365-day emotional and behavioral trajectory using your own data
- **Adaptive Coaching** — Surfaces insights at exactly the right moment via intelligent push notifications
- **Echo Sessions** — Daily AI-powered reflection sessions that feel like talking to a version of yourself that already knows everything

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React (Lovable), TypeScript, Framer Motion |
| Backend | Supabase (Auth, DB, Edge Functions, Realtime) |
| Database | PostgreSQL + pgvector |
| AI | OpenAI GPT-4o, text-embedding-3-large, Whisper |
| Payments | Stripe |
| Notifications | OneSignal |
| Monitoring | Vercel Analytics, Speed Insights, Sentry |
| Analytics | PostHog |
| CDN / Deploy | Vercel + Cloudflare |
| Error Tracking | Sentry |

---

## Repository Structure

```
echo-self/
├── .github/
│   ├── ISSUE_TEMPLATE/          # Bug, feature, epic, task templates
│   ├── workflows/               # CI/CD pipelines
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── docs/
│   ├── architecture/            # Technical architecture, DB schema, AI system
│   ├── product/                 # PRD, user stories, roadmap
│   ├── operations/              # Deployment, monitoring, analytics, QA
│   ├── launch/                  # App Store & Google Play checklists
│   └── compliance/              # Security & privacy/GDPR
├── supabase/
│   ├── migrations/              # SQL migrations (versioned)
│   ├── functions/               # Edge functions
│   └── seed.sql                 # Development seed data
├── src/
│   ├── components/              # React components
│   ├── screens/                 # App screens
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # AI, Supabase, Stripe clients
│   ├── stores/                  # Zustand state management
│   └── types/                   # TypeScript types
├── .env.example                 # Environment variable reference
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
└── CHANGELOG.md
```

---

## Quick Start (Local Development)

```bash
# 1. Clone
git clone https://github.com/your-org/echo-self.git
cd echo-self

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Fill in your Supabase, OpenAI, Stripe keys

# 4. Run Supabase locally
npx supabase start

# 5. Apply migrations
npx supabase db push

# 6. Start dev server
npm run dev
```

---

## GitHub Project Board

| Column | Description |
|---|---|
| Backlog | Groomed, estimated, not yet scheduled |
| Ready | Scheduled for current/next sprint |
| In Progress | Actively being worked |
| Review | PR open, awaiting review |
| Testing | QA / UAT in progress |
| Blocked | Waiting on dependency/decision |
| Done | Shipped to production |

---

## Milestones

| Milestone | Target | Goal |
|---|---|---|
| M0: Foundation | Week 2 | Auth, DB schema, CI/CD, project structure |
| M1: Core Loop | Week 5 | Journal → AI → Memory → Insight pipeline |
| M2: Identity Engine | Week 9 | Identity graph, emotional analysis, future self |
| M3: Monetization | Week 12 | Stripe subscriptions, paywall, free tier |
| M4: Growth | Week 15 | Viral loops, referrals, notifications |
| M5: App Store | Week 18 | iOS + Android submissions |
| M6: Scale | Week 24 | 10k MAU readiness, performance hardening |

---

## Sprints

2-week sprints. See [Sprint Roadmap](docs/project/SPRINT_ROADMAP.md) for full breakdown.

---

## Labels

See [GitHub Setup Guide](docs/project/GITHUB_SETUP.md) for complete label definitions, colors, and usage.

---

## Documentation Index

| Document | Description |
|---|---|
| [PRD](docs/product/PRD.md) | Full product requirements document |
| [Technical Architecture](docs/architecture/TECHNICAL_ARCHITECTURE.md) | System design, component map |
| [Database Schema](docs/architecture/DATABASE_SCHEMA.md) | Full PostgreSQL schema |
| [AI System](docs/architecture/AI_SYSTEM.md) | Memory, embeddings, prediction engine |
| [API Docs](docs/architecture/API_DOCS.md) | Edge function API reference |
| [Supabase Setup](docs/architecture/SUPABASE_SETUP.md) | Supabase configuration guide |
| [OpenAI Integration](docs/architecture/OPENAI_INTEGRATION.md) | AI integration patterns |
| [Vector Embeddings](docs/architecture/VECTOR_EMBEDDINGS.md) | pgvector architecture |
| [Notifications](docs/architecture/NOTIFICATIONS.md) | OneSignal notification system |
| [Stripe Integration](docs/architecture/STRIPE_INTEGRATION.md) | Subscription and paywall logic |
| [Realtime](docs/architecture/REALTIME.md) | Supabase Realtime infrastructure |
| [Analytics](docs/operations/ANALYTICS.md) | PostHog + Vercel Analytics plan |
| [Monitoring](docs/operations/MONITORING.md) | Sentry + Vercel observability |
| [Deployment](docs/operations/DEPLOYMENT.md) | Production deployment workflow |
| [QA Strategy](docs/operations/QA_STRATEGY.md) | Testing approach and coverage |
| [Feature Flags](docs/operations/FEATURE_FLAGS.md) | Feature flag system |
| [Event Tracking](docs/operations/EVENT_TRACKING.md) | User event taxonomy |
| [Viral Growth](docs/operations/VIRAL_GROWTH.md) | Growth loops and viral mechanics |
| [Monetization](docs/operations/MONETIZATION.md) | Revenue model and tracking |
| [Scaling](docs/operations/SCALING.md) | Infrastructure scaling strategy |
| [Security Checklist](docs/compliance/SECURITY_CHECKLIST.md) | Security posture review |
| [Privacy & GDPR](docs/compliance/PRIVACY_GDPR.md) | Privacy compliance checklist |
| [App Store Launch](docs/launch/APP_STORE_CHECKLIST.md) | iOS launch checklist |
| [Google Play Launch](docs/launch/GOOGLE_PLAY_CHECKLIST.md) | Android launch checklist |
| [Launch Playbook](docs/launch/LAUNCH_PLAYBOOK.md) | End-to-end launch operations |
| [GitHub Setup](docs/project/GITHUB_SETUP.md) | Labels, board, milestones setup |
| [GitHub Issues](docs/project/GITHUB_ISSUES.md) | Full issue breakdown with acceptance criteria |
| [Sprint Roadmap](docs/project/SPRINT_ROADMAP.md) | Sprint-by-sprint engineering plan |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for engineering standards, PR process, and code style.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting policy.

## License

Proprietary. All rights reserved. © 2026 ECHO//SELF Inc.
