# Product Requirements Document — ECHO//SELF

**Version:** 1.0  
**Date:** 2026-05-14  
**Author:** Founder / CTO  
**Status:** Active

---

## Executive Summary

ECHO//SELF is an AI-native identity operating system. It acts as a persistent emotional mirror and future-self prediction engine — learning who you are through what you share, surfacing invisible patterns, and projecting the version of you your current trajectory builds toward.

The core product insight: most people have no accurate model of themselves. They act from emotion, habit, and fear — not from clear self-knowledge. ECHO//SELF creates that model for you, updates it continuously, and reflects it back in ways that feel revelatory rather than clinical.

**Target users:** High-agency individuals aged 25–45 who journal, do therapy, or engage in self-development practices — and want more signal from the data they're already generating.

**Revenue model:** Freemium subscription ($12.99/mo or $89/yr). Free tier limited to 7 entries/month and 3 Echo sessions.

**Success metric:** 40%+ Day-30 retention rate (benchmark for top journaling apps: 8–12%).

---

## Problem

### What's broken today

1. **Journaling is a black hole.** People write daily but get nothing back. No synthesis. No patterns. No growth signal.
2. **Self-knowledge is expensive.** Therapy is $200/session. Coaching is $500/month. Most people can't access consistent reflection.
3. **AI chatbots forget everything.** Every conversation starts from zero. There is no persistent model of you.
4. **Insight lags experience.** You only understand what happened months or years later, if ever.

### The opportunity

For the first time, large language models can:
- Hold and reason over long-term memory
- Analyze emotional patterns with clinical accuracy
- Generate probabilistic predictions about human behavior
- Speak with the warmth and specificity of someone who knows you

ECHO//SELF applies this to the one domain where it matters most: self-understanding.

---

## Solution

### Core Loop

```
User writes or speaks → AI extracts memories & emotions →
Memory graph updates → Patterns surface → Insight delivered →
Future self prediction updated → User returns tomorrow
```

### Key Product Pillars

#### 1. Persistent AI Memory
Every journal entry, voice note, and Echo session is processed into atomic memories. These are embedded as vectors and stored permanently. The AI never forgets.

#### 2. Emotional Intelligence Engine
Entries are analyzed for:
- Primary emotion (joy, fear, anger, sadness, surprise, disgust, neutral)
- Secondary emotions with intensity scores
- Emotional trajectory (trending up/down over time)
- Emotional triggers (recurring patterns)

#### 3. Identity Graph
A living map of the user's:
- Core values (what they actually prioritize, not what they say)
- Deep fears (what consistently makes them contract)
- Behavioral patterns (recurring responses to recurring situations)
- Strengths (capacities that appear across contexts)
- Belief system (assumptions about themselves and the world)

#### 4. Future Self Engine
Using the identity graph + behavioral patterns + current trajectory:
- 30-day prediction: "If you continue this pattern..."
- 90-day prediction: "The version of you most likely to emerge..."
- 365-day prediction: "Your future self says..."

#### 5. Echo Sessions
Daily 5–10 minute AI-guided reflection sessions. The AI plays the role of a wiser future version of the user — asking questions the user needs to hear, not wants to hear.

---

## User Personas

### Primary: The Conscious Achiever (Maya, 31)
- Earns $90K+, Type A, high self-awareness
- Journals 3–4x/week but feels she's not getting synthesis
- Tried therapy (too expensive), meditation apps (too generic)
- Wants: clarity on blind spots, confidence in decisions, visibility into patterns
- Willingness to pay: $15/month if she gets clear value

### Secondary: The Self-Developer (Jordan, 27)
- Reads self-help books, listens to podcasts, tries new tools
- Excited by AI, early adopter
- Wants: a tool that learns him over time, not another one-size-fits-all app
- Willingness to pay: $10/month if the AI feels genuinely personalized

### Anti-persona: The Casual User
- Downloads app from curiosity, doesn't journal consistently
- Won't provide enough data for AI to work
- Not our core market — free tier is appropriate for them

---

## Feature Requirements

### F1: Authentication

| ID | Requirement | Priority |
|---|---|---|
| F1.1 | Email + password sign up with verification | P0 |
| F1.2 | Apple Sign In (iOS + web) | P0 |
| F1.3 | Google Sign In (iOS + Android + web) | P0 |
| F1.4 | Biometric auth (FaceID / TouchID) for returning users | P1 |
| F1.5 | Session management with secure token refresh | P0 |
| F1.6 | Account deletion (GDPR Article 17) — purges all data | P0 |

### F2: Onboarding

| ID | Requirement | Priority |
|---|---|---|
| F2.1 | 5-step onboarding with cinematic animations | P0 |
| F2.2 | Collect: name, current emotion, primary goal | P0 |
| F2.3 | AI-generated personalized welcome (Step 5) | P0 |
| F2.4 | Skip option on all steps except name | P1 |
| F2.5 | Progress persistence (resume interrupted onboarding) | P1 |
| F2.6 | First journal prompt auto-generated from onboarding | P0 |

### F3: Journal

| ID | Requirement | Priority |
|---|---|---|
| F3.1 | Text entry with auto-save (3s debounce) | P0 |
| F3.2 | Voice-to-text via Whisper API | P1 |
| F3.3 | Emotion tags auto-generated per entry | P0 |
| F3.4 | AI response option ("How does this land?") | P0 |
| F3.5 | Journal list view with emotion indicators | P0 |
| F3.6 | Search journal entries (full-text) | P2 |
| F3.7 | Entry edit (within 24 hours of creation) | P2 |
| F3.8 | Entry delete with confirmation | P1 |
| F3.9 | Daily prompt shown on empty home screen | P1 |

### F4: AI Memory System

| ID | Requirement | Priority |
|---|---|---|
| F4.1 | Memory extraction from journal entries | P0 |
| F4.2 | Vector embedding (text-embedding-3-large) | P0 |
| F4.3 | Semantic memory retrieval | P0 |
| F4.4 | Duplicate memory detection & merging | P1 |
| F4.5 | Memory browser UI (searchable list) | P2 |
| F4.6 | Memory tags: emotion, topic, date, intensity | P1 |

### F5: Echo Sessions

| ID | Requirement | Priority |
|---|---|---|
| F5.1 | AI-guided daily reflection sessions | P0 |
| F5.2 | Streaming AI responses (word-by-word) | P0 |
| F5.3 | Memory-grounded questions | P0 |
| F5.4 | Session theme auto-detection | P1 |
| F5.5 | End-of-session insight | P0 |
| F5.6 | Session history | P1 |
| F5.7 | "Go deeper" — continue session thread | P2 |

### F6: Identity Engine

| ID | Requirement | Priority |
|---|---|---|
| F6.1 | Identity node extraction (values, fears, strengths, patterns) | P0 |
| F6.2 | Node confidence scoring | P1 |
| F6.3 | Identity graph visualization | P1 |
| F6.4 | Future self predictions (30/90/365 days) | P0 |
| F6.5 | Node challenge (user can flag as outdated) | P2 |
| F6.6 | Identity evolution timeline | P2 |

### F7: Monetization

| ID | Requirement | Priority |
|---|---|---|
| F7.1 | Free tier: 7 journal entries/mo, 3 Echo sessions/mo | P0 |
| F7.2 | Pro tier: unlimited (monthly + annual) | P0 |
| F7.3 | 14-day free trial, no credit card | P0 |
| F7.4 | Stripe Checkout subscription creation | P0 |
| F7.5 | Stripe Customer Portal (manage/cancel) | P0 |
| F7.6 | Paywall enforcement at usage limits | P0 |
| F7.7 | Payment failure graceful degradation | P0 |

### F8: Notifications

| ID | Requirement | Priority |
|---|---|---|
| F8.1 | Daily streak reminder (opt-in) | P0 |
| F8.2 | "New insight ready" notification | P1 |
| F8.3 | Future self check-in (weekly) | P1 |
| F8.4 | Re-engagement after 3-day lapse | P1 |
| F8.5 | Optimal send time per user (AI-driven) | P2 |
| F8.6 | A/B test notification copy | P2 |

### F9: Growth

| ID | Requirement | Priority |
|---|---|---|
| F9.1 | Referral codes (unique per user) | P1 |
| F9.2 | "Share my Future Self" OG image | P1 |
| F9.3 | Referrer reward: 1 month free on conversion | P2 |
| F9.4 | Streak mechanics (7, 30, 100 day badges) | P1 |
| F9.5 | In-app review prompt (after 5th Echo session) | P1 |

---

## Non-Functional Requirements

### Performance
- App cold start: < 2 seconds
- Journal entry save: < 100ms (optimistic UI)
- AI emotion analysis: < 3 seconds
- Echo session first response: < 800ms (streaming starts)
- Memory retrieval: < 200ms
- App size: < 50MB on iOS

### Privacy & Security
- All user data encrypted at rest and in transit
- User data never used for AI model training (OpenAI Enterprise)
- GDPR-compliant data deletion within 30 days of request
- CCPA-compliant data export available
- No third-party analytics SDKs with cross-app tracking

### Accessibility
- VoiceOver (iOS) + TalkBack (Android) compatible
- Minimum contrast ratio: 4.5:1 (WCAG AA)
- Dynamic type support (iOS)
- Reduced motion mode respected

### Availability
- 99.9% uptime target
- AI features: degraded gracefully (static fallback) if OpenAI unavailable
- Auth: always available (Supabase)

---

## Success Metrics

### North Star
**Weekly Active Users who complete ≥1 Echo session** — this is the behavior that drives retention, upgrade, and referral.

### Core Metrics

| Metric | Target (Month 3) | Target (Month 6) |
|---|---|---|
| D1 Retention | > 45% | > 50% |
| D7 Retention | > 25% | > 30% |
| D30 Retention | > 15% | > 20% |
| Echo sessions / WAU | > 3 | > 4 |
| Free → Pro conversion | > 8% | > 12% |
| Monthly churn (Pro) | < 5% | < 4% |
| Referral rate (shares/user) | > 0.2 | > 0.35 |

### Leading Indicators
- Onboarding completion rate > 75%
- Journal entries / DAU > 0.8
- Echo sessions initiated within first 3 days > 60%
- Notification opt-in rate > 55%

---

## Out of Scope (v1)

- Group/shared echo sessions
- Therapist integration or professional advice
- Wearable data integration (Apple Watch, Oura)
- Multilingual support (English only at launch)
- Web app (mobile-first, web later)
- Team/B2B features
