# Sprint Roadmap — ECHO//SELF

2-week sprints. Target: App Store submission by Week 18.

---

## Sprint Overview

| Sprint | Dates | Milestone | Focus | Points |
|---|---|---|---|---|
| S1 | W1–W2 | M0 | Foundation: DB, auth, CI/CD | 21 pts |
| S2 | W3–W4 | M0→M1 | Onboarding, navigation, journal UI | 24 pts |
| S3 | W5–W6 | M1 | AI pipeline: emotion, memory, embedding | 21 pts |
| S4 | W7–W8 | M1→M2 | Echo sessions, memory retrieval | 18 pts |
| S5 | W9–W10 | M2 | Identity graph, future self predictions | 21 pts |
| S6 | W11–W12 | M2→M3 | Polish, bug bash, performance | 13 pts |
| S7 | W13–W14 | M3 | Stripe subscriptions, paywall | 24 pts |
| S8 | W15–W16 | M4 | Notifications, referral, viral loop | 21 pts |
| S9 | W17–W18 | M5 | App store prep, TestFlight, submission | 18 pts |
| S10+ | W19–W24 | M6 | Scale, 10k MAU hardening, growth | ongoing |

---

## Sprint 1 — Foundation (Week 1–2)

**Goal:** Everything needs to run. CI green. DB live. Auth working.

**Issues:**
| # | Title | Points | Labels |
|---|---|---|---|
| #001 | Supabase setup & schema migration | 5 | `database`, `infra` |
| #002 | CI/CD pipeline & GitHub Actions | 3 | `infra` |
| #003 | Auth flow (email + Apple + Google) | 5 | `auth`, `frontend` |
| #T001 | TypeScript project setup (tsconfig, eslint, prettier) | 2 | `infra`, `chore` |
| #T002 | Environment variable structure + `.env.example` | 1 | `infra` |
| #T003 | Supabase local dev setup + seed data | 2 | `database` |
| #T004 | Error reporting: Sentry init (client + server) | 2 | `infra` |
| #T005 | Analytics: PostHog init + page tracking | 1 | `analytics` |

**Total:** 21 pts | **Sprint velocity target:** 21 pts

**Definition of Done:**
- [ ] `npm run dev` starts without errors
- [ ] `supabase start` runs all migrations cleanly
- [ ] CI pipeline green on every commit
- [ ] User can sign up, sign in, sign out
- [ ] Error shows in Sentry on test throw
- [ ] PostHog receives page view event

---

## Sprint 2 — Onboarding & Shell (Week 3–4)

**Goal:** New user has a complete first experience end-to-end.

**Issues:**
| # | Title | Points | Labels |
|---|---|---|---|
| #004 | Core navigation & app shell | 3 | `frontend`, `mobile` |
| #005 | Onboarding flow (5 steps + AI step 5) | 8 | `frontend`, `ai`, `onboarding` |
| #T006 | Design system: components (Button, Input, Card) | 3 | `frontend`, `ui/ux` |
| #T007 | Dark mode theme tokens + ThemeProvider | 2 | `frontend`, `ui/ux` |
| #T008 | Home screen — journal prompt + streak counter | 3 | `frontend` |
| #T009 | Framer Motion base animations setup | 2 | `frontend`, `ui/ux` |
| #T010 | Haptic feedback utility | 1 | `mobile` |
| #T011 | Deep link routing setup | 2 | `mobile` |

**Total:** 24 pts

**Definition of Done:**
- [ ] New user completes onboarding start to finish
- [ ] AI generates personalized Step 5 response
- [ ] All 5 tabs navigate correctly
- [ ] Dark mode renders correctly on all screens
- [ ] Framer Motion transitions are smooth (60fps)

---

## Sprint 3 — AI Pipeline (Week 5–6)

**Goal:** Journal entry → emotion analysis → memory extraction → embeddings → all working in production.

**Issues:**
| # | Title | Points | Labels |
|---|---|---|---|
| #006 | Journal entry write flow (text + voice) | 5 | `frontend`, `ai` |
| #007 | Memory system (storage + embeddings + retrieval) | 8 | `ai`, `database` |
| #T012 | Emotion analysis edge function | 3 | `ai`, `backend` |
| #T013 | OpenAI SDK setup + rate limiting middleware | 2 | `ai`, `infra` |
| #T014 | Journal list screen with emotion chips | 2 | `frontend` |
| #T015 | Voice-to-text (Whisper) integration | 3 | `ai`, `mobile` |

**Total:** 23 pts

**Definition of Done:**
- [ ] Write journal entry → emotions appear within 3s
- [ ] Memories extracted and stored after entry saved
- [ ] Semantic search returns correct memories (manual eval)
- [ ] Voice recording transcribes correctly
- [ ] All AI calls have timeouts and fallback behavior

---

## Sprint 4 — Echo Sessions (Week 7–8)

**Goal:** The core ECHO//SELF product experience is live.

**Issues:**
| # | Title | Points | Labels |
|---|---|---|---|
| #008 | Echo session — full conversation flow | 8 | `ai`, `frontend` |
| #T016 | AI streaming response (SSE/Realtime) | 3 | `ai`, `backend`, `realtime` |
| #T017 | Echo session history screen | 2 | `frontend` |
| #T018 | Memory context injection for Echo sessions | 3 | `ai`, `backend` |
| #T019 | Session insight extraction (end of session) | 2 | `ai` |

**Total:** 18 pts

**Definition of Done:**
- [ ] Echo session starts from home screen
- [ ] AI response streams word-by-word (not chunked)
- [ ] Relevant memories used in AI context
- [ ] Session stored and viewable in history
- [ ] End-of-session insight displayed

---

## Sprint 5 — Identity Engine (Week 9–10)

**Goal:** The identity graph and future self engine are live.

**Issues:**
| # | Title | Points | Labels |
|---|---|---|---|
| #009 | Identity graph — belief & pattern extraction | 8 | `ai`, `database` |
| #T020 | Identity screen — graph visualization | 5 | `frontend`, `ui/ux` |
| #T021 | Future self prediction engine (30/90/365 day) | 5 | `ai`, `backend` |
| #T022 | Identity node detail view | 3 | `frontend` |

**Total:** 21 pts

---

## Sprint 6 — Polish & Bug Bash (Week 11–12)

**Goal:** Product feels finished. No bugs. Performance targets met.

**Issues:**
| # | Title | Points | Labels |
|---|---|---|---|
| #T023 | Bug bash — fix top 10 issues from dogfooding | 5 | `bug` |
| #T024 | Performance audit — LCP, INP, bundle size | 3 | `performance` |
| #T025 | Accessibility audit (screen reader, contrast) | 2 | `ui/ux` |
| #T026 | Error states — every screen has one | 2 | `frontend` |
| #T027 | Empty states — new user experience | 1 | `frontend` |

**Total:** 13 pts

---

## Sprint 7 — Monetization (Week 13–14)

**Goal:** Revenue infrastructure live. Users can subscribe.

**Issues:**
| # | Title | Points | Labels |
|---|---|---|---|
| #010 | Stripe subscription integration | 8 | `payments`, `backend` |
| #T028 | Paywall screen + upgrade flow | 5 | `frontend`, `monetization` |
| #T029 | Free tier limit enforcement | 3 | `backend`, `monetization` |
| #T030 | Subscription management (portal) | 3 | `frontend`, `payments` |
| #T031 | Trial expiry flow + win-back email | 3 | `payments`, `retention` |
| #T032 | Revenue analytics — Stripe → PostHog | 2 | `analytics`, `monetization` |

**Total:** 24 pts

---

## Sprint 8 — Growth (Week 15–16)

**Goal:** Growth loops operational.

**Issues:**
| # | Title | Points | Labels |
|---|---|---|---|
| #011 | Adaptive notification system | 5 | `notifications`, `ai` |
| #012 | Viral referral system | 5 | `viral-loop`, `backend` |
| #T033 | Streak mechanics (7-day, 30-day) | 3 | `retention` |
| #T034 | In-app review prompt (after 5th Echo session) | 1 | `retention` |
| #T035 | Share card — OG image for social sharing | 3 | `viral-loop`, `frontend` |
| #T036 | Push notification A/B test (PostHog) | 2 | `notifications`, `analytics` |
| #T037 | Re-engagement campaign (day 3 lapse) | 2 | `notifications`, `retention` |

**Total:** 21 pts

---

## Sprint 9 — App Store Launch (Week 17–18)

**Goal:** Submitted to both stores.

**Issues:**
| # | Title | Points | Labels |
|---|---|---|---|
| #013 | iOS App Store submission | 5 | `mobile` |
| #014 | Google Play submission | 5 | `mobile` |
| #T038 | App Store screenshots (6.7", 6.1", iPad) | 3 | `mobile`, `ui/ux` |
| #T039 | App Store copy — title, subtitle, keywords, description | 2 | `mobile` |
| #T040 | Privacy policy + Terms of Service pages | 1 | `compliance` |
| #T041 | TestFlight internal + external beta | 2 | `mobile` |

**Total:** 18 pts

---

## Sprint 10+ — Scale & Optimization (Week 19–24)

**Goal:** Handle 10k MAU without performance degradation.

**Issues:**
| # | Title | Points | Labels |
|---|---|---|---|
| #015 | Performance hardening for 10k MAU | 8 | `performance`, `database` |
| #T042 | Database query optimization + indexing audit | 5 | `database`, `performance` |
| #T043 | Vercel Speed Insights + LCP optimization | 3 | `performance`, `infra` |
| #T044 | AI cost optimization (caching, batching) | 5 | `ai`, `performance` |
| #T045 | Supavisor connection pooling | 2 | `database`, `infra` |
| #T046 | Cloudflare CDN optimization | 2 | `infra`, `performance` |
| #T047 | Load testing (k6) — simulate 10k concurrent | 3 | `infra`, `performance` |
