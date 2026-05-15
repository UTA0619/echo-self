# GitHub Issues — Full Breakdown

Complete issue definitions for ECHO//SELF with acceptance criteria, technical specs, and QA requirements.

---

## EPIC-001: Foundation & Infrastructure

**Milestone:** M0 | **Sprint:** 1–2 | **Labels:** `epic`, `infra`

### ISSUE-001: Supabase Project Setup & Schema Migration

**Priority:** P0 | **Points:** 5 | **Est:** 8h | **Labels:** `database`, `infra`, `P0 - Critical`

**Objective:** Initialize Supabase project with full PostgreSQL schema, RLS policies, and pgvector extension.

**Acceptance Criteria:**
- [ ] Supabase project created with correct region (us-east-1)
- [ ] pgvector extension enabled
- [ ] All core tables created with correct types and constraints
- [ ] RLS enabled on every table with correct policies
- [ ] Auth providers configured: email/password, Apple, Google
- [ ] TypeScript types generated and committed
- [ ] Local dev Supabase runs cleanly with `supabase start`

**Frontend Tasks:** N/A
**Backend Tasks:**
- Create `supabase/migrations/001_initial_schema.sql`
- Enable pgvector extension
- Create tables: `profiles`, `journal_entries`, `memories`, `identity_nodes`, `insights`, `embeddings`
- Write RLS policies for each table
- Configure Auth providers in Supabase dashboard
- Generate TypeScript types: `supabase gen types typescript --local > src/types/supabase.ts`

**Database Tasks:**
```sql
-- Tables: profiles, journal_entries, memories, identity_nodes,
--         insights, emotion_logs, embeddings, subscriptions
-- Extensions: vector, pg_trgm, uuid-ossp
-- RLS: Enabled on all tables, user-isolation policies
```

**QA Checklist:**
- [ ] User A cannot read User B's data (RLS test)
- [ ] Anonymous user gets 0 rows from all tables
- [ ] Types match actual DB schema
- [ ] Migration runs cleanly on fresh DB

---

### ISSUE-002: CI/CD Pipeline & GitHub Actions

**Priority:** P0 | **Points:** 3 | **Est:** 6h | **Labels:** `infra`, `P0 - Critical`

**Objective:** Set up full CI/CD with type checking, testing, Supabase migration validation, and Vercel preview deployments.

**Acceptance Criteria:**
- [ ] CI runs on every PR: type-check, lint, test, build
- [ ] Secret scanning blocks PRs with committed secrets
- [ ] Preview deployments auto-generate on PR open/update
- [ ] Preview URL commented on PR automatically
- [ ] Production deploy triggers on merge to `main`
- [ ] Post-deploy error scan runs after production deploy
- [ ] Sentry release created on production deploy

**Engineering Notes:** Use `vercel deploy --prebuilt` — build and deploy are separate jobs. This enables running tests between build and deploy. Pin Vercel CLI to version 54 to avoid breaking changes.

---

### ISSUE-003: Authentication Flow (Email + Apple + Google)

**Priority:** P0 | **Points:** 5 | **Est:** 10h | **Labels:** `auth`, `frontend`, `mobile`, `P0 - Critical`

**Objective:** Implement full auth flow with email/password, Apple Sign In, and Google Sign In. Includes sign up, sign in, forgot password, and session management.

**Acceptance Criteria:**
- [ ] Email/password sign up with verification email
- [ ] Email/password sign in
- [ ] Apple Sign In (iOS + web)
- [ ] Google Sign In (iOS + Android + web)
- [ ] Forgot password / reset password flow
- [ ] Session persists across app restarts
- [ ] Invalid credentials shows clear error
- [ ] Auth state syncs instantly via Supabase Realtime
- [ ] User profile auto-created on first sign up (DB trigger)

**Frontend Tasks:**
- `src/screens/auth/WelcomeScreen.tsx` — splash with Apple/Google/Email options
- `src/screens/auth/SignUpScreen.tsx` — email + password form
- `src/screens/auth/SignInScreen.tsx` — email + password form
- `src/screens/auth/ForgotPasswordScreen.tsx`
- `src/screens/auth/ResetPasswordScreen.tsx`
- `src/hooks/useAuth.ts` — Supabase auth hook with session management
- `src/stores/authStore.ts` — Zustand auth state

**Backend Tasks:**
- `supabase/migrations/001_profiles_trigger.sql` — auto-create profile on user insert
- Configure Apple OAuth in Supabase (requires Apple Developer Account)
- Configure Google OAuth in Supabase

**AI Notes:** N/A

**UI Notes:**
- Welcome screen: dark background, ECHO//SELF logo animation (Framer Motion), subtle particle effect
- Form inputs: floating label style, biometric confirm on iOS
- Loading state: pulsing logo, not spinner
- Error state: inline under field, no modal

**Edge Cases:**
- Email already registered → show "Sign in instead" prompt
- OAuth account with same email as existing account → merge prompt
- Network offline during auth → queue retry with clear offline indicator

**QA Checklist:**
- [ ] Sign up → verification email received
- [ ] Sign in with unverified email → friendly error
- [ ] Apple Sign In on iOS Simulator works
- [ ] Google Sign In works
- [ ] Forgot password → reset email received → can sign back in
- [ ] Session persists after app close/reopen
- [ ] Sign out clears all local state

---

### ISSUE-004: Core Navigation & App Shell

**Priority:** P0 | **Points:** 3 | **Est:** 6h | **Labels:** `frontend`, `mobile`, `ui/ux`, `P0 - Critical`

**Objective:** Implement the main app navigation structure with tab bar, home screen, and core screen routing.

**Acceptance Criteria:**
- [ ] Bottom tab bar: Home, Journal, Echo, Identity, Profile
- [ ] Smooth tab transitions (Framer Motion)
- [ ] Deep link support for all main screens
- [ ] Haptic feedback on tab selection
- [ ] Dark mode default, light mode supported
- [ ] Safe area insets handled on all devices
- [ ] Header/status bar colors match current screen theme

**Frontend Tasks:**
- `src/navigation/AppNavigator.tsx` — root navigator
- `src/navigation/TabNavigator.tsx` — bottom tab bar
- `src/components/BottomTab.tsx` — custom tab bar with animations
- `src/screens/HomeScreen.tsx` — dashboard
- `src/components/layout/SafeAreaWrapper.tsx`
- `src/constants/theme.ts` — design tokens (colors, spacing, typography)

**UI Notes:**
- Tab bar: frosted glass effect on dark background, icon + label
- Active tab: icon scales up 1.1x with spring animation, label fades in
- Tab switch: content fades with 150ms ease-out
- Colors: pitch black base (#050508), deep violet accents (#6D28D9), white text

---

### ISSUE-005: Onboarding Flow — Animated Welcome Sequence

**Priority:** P1 | **Points:** 8 | **Est:** 16h | **Labels:** `frontend`, `onboarding`, `ui/ux`, `P1 - High`

**Objective:** Build a cinematic onboarding experience that emotionally activates users before they see the core product.

**Acceptance Criteria:**
- [ ] 5-step onboarding flow with progress indicator
- [ ] Each step has a full-screen animation (Lottie or Framer Motion)
- [ ] Personalization: asks name, emotional context, first goal
- [ ] Skip option on every step except name collection
- [ ] Data collected stored in user profile
- [ ] Onboarding state persisted (resumes if interrupted)
- [ ] First journal prompt auto-generated from onboarding answers
- [ ] Completion triggers confetti / celebration moment
- [ ] Haptic feedback on each step transition

**Frontend Tasks:**
- `src/screens/onboarding/OnboardingNavigator.tsx`
- `src/screens/onboarding/Step1_Welcome.tsx` — "Your mind has a pattern" — animated neural network
- `src/screens/onboarding/Step2_Identity.tsx` — "What's your name?" + "What brings you here?"
- `src/screens/onboarding/Step3_Emotion.tsx` — "How do you feel right now?" — emotion selector
- `src/screens/onboarding/Step4_Goal.tsx` — "What do you want to understand about yourself?"
- `src/screens/onboarding/Step5_FirstEcho.tsx` — "Meet your Echo" — AI-generated intro
- `src/hooks/useOnboarding.ts` — state management + progress persistence

**Backend Tasks:**
- Edge function: `generate-onboarding-echo` — takes name, emotion, goal → generates personalized intro
- Store onboarding data in `profiles.onboarding_data` (JSONB)

**AI Notes:**
- Step 5 prompt: Generate a single, powerful, 2-sentence reflection based on name, current emotion, and stated goal. Tone: wise, direct, slightly mysterious. Voice: a future version of the user speaking to them.
- Input: `{ name, emotion, goal }` → Output: 2-sentence personalized insight string

**Motion Design:**
- Step 1: Particle system forming a brain/neural shape, fades to ECHO//SELF logo
- Step 2: Name types out character by character after user input (typewriter effect)
- Step 3: Emotion orbs float and pulse, selected one expands to fill screen
- Step 4: Goal text morphs/transforms as user types
- Step 5: AI response streams in word by word with a glowing cursor

**Edge Cases:**
- User skips emotion step → default to "neutral" for AI generation
- AI generation fails → fallback to static inspiring quote
- User interrupts onboarding midway → resume from last completed step

**QA Checklist:**
- [ ] Full onboarding flow completes without error
- [ ] AI step 5 response generates within 3 seconds
- [ ] Animations run at 60fps on iPhone 14 (test in simulator)
- [ ] Dark mode looks correct on all steps
- [ ] Haptics fire on each step transition (iOS)
- [ ] Profile data saved correctly after completion
- [ ] Re-opening app mid-onboarding resumes correctly

---

## EPIC-002: AI Memory & Journal System

**Milestone:** M1 | **Sprint:** 3–5 | **Labels:** `epic`, `ai`, `database`

### ISSUE-006: Journal Entry — Core Write Flow

**Priority:** P0 | **Points:** 5 | **Est:** 10h | **Labels:** `frontend`, `ai`, `P0 - Critical`

**Objective:** The primary input surface. Users write journal entries; AI processes them into memories, emotions, and insights in real time.

**Acceptance Criteria:**
- [ ] Rich text input (no markdown, just clean text)
- [ ] Auto-save every 3 seconds (debounced)
- [ ] Voice-to-text via Whisper API
- [ ] Minimum entry length: 50 characters for AI processing
- [ ] AI processing begins within 500ms of entry save
- [ ] Emotion tags auto-generated by AI and displayed below entry
- [ ] "How does this land?" prompt after entry (optional AI response)
- [ ] Entry visible in journal list immediately after save

**Frontend Tasks:**
- `src/screens/journal/JournalEntryScreen.tsx`
- `src/components/journal/TextInput.tsx` — auto-expanding, dark theme
- `src/components/journal/VoiceButton.tsx` — hold to record
- `src/components/journal/EmotionChips.tsx` — AI-generated emotion tags
- `src/hooks/useJournalEntry.ts` — auto-save, voice, AI processing state
- `src/components/journal/AIResponseStream.tsx` — streaming AI response

**Backend Tasks:**
- Edge function: `process-journal-entry` — receives entry text → emotion analysis → memory extraction → insight generation
- `api/journal/route.ts` — CRUD for journal entries
- `api/voice-to-text/route.ts` — Whisper API proxy

**AI Tasks:**
- Emotion analysis: extract primary + secondary emotions with intensity (0-1 scale)
- Memory extraction: identify 3-5 key memories/facts from entry
- Insight generation: 1 sentence insight surfaced from pattern analysis
- Embedding generation: `text-embedding-3-large` for the full entry text

**Edge Cases:**
- Entry < 50 chars → save without AI processing, prompt to "write more"
- AI processing timeout (> 10s) → save entry, retry processing async
- Voice recording failed → show error, keep text fallback focused
- Offline → queue entry, process when reconnected

**Performance:**
- Text input: 0 lag on keystroke (local state)
- Auto-save: debounced 3s, no loading indicator
- AI response: starts streaming within 800ms

---

### ISSUE-007: Memory System — Storage & Retrieval

**Priority:** P0 | **Points:** 8 | **Est:** 16h | **Labels:** `ai`, `database`, `backend`, `P0 - Critical`

**Objective:** Implement the long-term memory system that stores, embeds, and retrieves user memories semantically.

**Acceptance Criteria:**
- [ ] Memory extraction from journal entries (Edge Function)
- [ ] Each memory embedded with `text-embedding-3-large` (3072 dimensions)
- [ ] Memories stored in `memories` table with pgvector embedding
- [ ] Semantic search returns top-K relevant memories (cosine similarity)
- [ ] Memory retrieval < 200ms P99
- [ ] Duplicate memories detected and merged (similarity > 0.95)
- [ ] Memories tagged with: emotion, topic, date, intensity
- [ ] Memory timeline view in UI

**Backend Tasks:**
- `supabase/migrations/002_ai_memory.sql` — memories + embeddings tables
- `supabase/functions/process-memory/index.ts` — extract + embed + store memories
- `src/lib/memory/retrieval.ts` — semantic search using pgvector `<=>` operator
- `src/lib/memory/deduplication.ts` — merge similar memories
- Cron: `process-memory-embeddings` — reprocess pending embeddings every 15 min

**Database Schema:**
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(3072),
  emotion TEXT,
  topic TEXT,
  intensity FLOAT CHECK (intensity >= 0 AND intensity <= 1),
  source_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own memories" ON memories
  USING (user_id = auth.uid());
```

**AI Notes:**
- Memory extraction prompt: Given this journal entry, extract 3-5 atomic facts or beliefs about the person. Each memory should be a complete sentence. Focus on values, fears, desires, patterns, and relationships.
- Embedding model: `text-embedding-3-large`, 3072 dimensions
- Retrieval: `SELECT * FROM memories WHERE user_id = $1 ORDER BY embedding <=> $2 LIMIT 20`

**Performance:**
- Embedding generation: batched, max 100 texts per OpenAI API call
- IVFFlat index with 100 lists (tuned for < 1M rows)
- Query plan: index scan → RLS filter → return top-K

**QA Checklist:**
- [ ] Memory saved after journal entry processed
- [ ] Semantic search returns relevant results (manual eval with 10 test cases)
- [ ] User A cannot retrieve User B's memories
- [ ] Duplicate detection merges near-identical memories
- [ ] Memory count matches journal entry count (± extraction variance)

---

### ISSUE-008: AI Reflection Engine — "Echo Session"

**Priority:** P1 | **Points:** 8 | **Est:** 16h | **Labels:** `ai`, `frontend`, `retention`, `P1 - High`

**Objective:** The core product experience — a daily AI-powered reflection session that feels like talking to a future version of yourself.

**Acceptance Criteria:**
- [ ] Echo session initiated from home screen or notification
- [ ] AI pulls 5-10 relevant memories before generating questions
- [ ] Streamed AI responses (word-by-word, not chunked)
- [ ] Conversation stored as journal entry when session ends
- [ ] Each session has a distinct "theme" (auto-detected by AI)
- [ ] Session ends with a 1-sentence insight
- [ ] Average session length: 5-10 minutes
- [ ] Users can "go deeper" (continue the thread)

**Frontend Tasks:**
- `src/screens/echo/EchoSessionScreen.tsx`
- `src/components/echo/MessageBubble.tsx` — user + AI messages
- `src/components/echo/AITypingIndicator.tsx` — animated typing dots
- `src/components/echo/StreamingResponse.tsx` — word-by-word render
- `src/hooks/useEchoSession.ts` — session state, streaming, history

**Backend Tasks:**
- `supabase/functions/echo-session/index.ts` — orchestrates memory retrieval + GPT-4o streaming
- System prompt construction using retrieved memories
- Session storage in `journal_entries` with `type: 'echo_session'`

**AI Notes:**
- Retrieval: fetch top-10 memories using query embedding before generating first message
- System prompt structure:
  ```
  You are [user.name]'s future self — wiser, more grounded, and at peace.
  You remember everything they've shared. Speak with intimacy and clarity.
  Current emotional context: [last_emotion]
  Relevant memories: [retrieved_memories]
  Start with a specific observation about a pattern you've noticed.
  Ask one question at a time. Never more than one.
  ```
- Streaming: use OpenAI streaming API, pipe chunks to client via Supabase Realtime or SSE
- Max tokens per response: 300
- Temperature: 0.8

**Motion Design:**
- Session opens with full-screen dark gradient, ECHO//SELF logo fades in
- AI message appears word-by-word with a soft glow on each new word
- User message: appears immediately, aligned right, slightly transparent
- Session theme badge animates in at session start

**Edge Cases:**
- User with < 5 memories (new user) → uses onboarding context instead
- AI response fails → retry once silently, then show "Echo is thinking..." with manual retry
- Session interrupted → resume where left off within 24 hours

---

### ISSUE-009: Identity Graph — Belief & Pattern Extraction

**Priority:** P1 | **Points:** 8 | **Est:** 16h | **Labels:** `ai`, `database`, `P1 - High`

**Objective:** Build the identity graph that maps user beliefs, values, fears, strengths, and behavioral patterns extracted from all memories.

**Acceptance Criteria:**
- [ ] Identity nodes extracted from memories: values, fears, beliefs, strengths, patterns
- [ ] Node strength/confidence scored 0-1 based on frequency + recency
- [ ] Graph visualization on Identity screen (D3 or react-native-svg)
- [ ] Nodes update weekly (cron) and on-demand
- [ ] Top 5 identity nodes shown on home screen
- [ ] Changes tracked over time (identity evolution)
- [ ] User can "challenge" a node (flag it as no longer true)

**Backend Tasks:**
- `supabase/migrations/003_identity_graph.sql`
- `supabase/functions/extract-identity/index.ts` — batch process memories → identity nodes
- `src/lib/identity/scoring.ts` — node strength calculation
- Cron: weekly identity extraction

**AI Notes:**
- Identity extraction prompt:
  ```
  Based on these memories, identify the user's core identity nodes.
  Return JSON: { nodes: [{ type: "value|fear|belief|strength|pattern", label: string, evidence: string[], confidence: 0-1 }] }
  Focus on consistent patterns across multiple memories, not one-off events.
  ```

---

## EPIC-003: Monetization

**Milestone:** M3 | **Sprint:** 7–8 | **Labels:** `epic`, `payments`, `monetization`

### ISSUE-010: Stripe Subscription Integration

**Priority:** P0 | **Points:** 8 | **Est:** 16h | **Labels:** `payments`, `backend`, `frontend`, `P0 - Critical`

**Objective:** Full Stripe subscription system with free tier, 14-day trial, monthly/annual plans, and paywall enforcement.

**Acceptance Criteria:**
- [ ] Free tier: 7 journal entries/month, 3 Echo sessions, no identity graph
- [ ] Pro tier ($12.99/mo or $89/yr): unlimited everything
- [ ] 14-day free trial on Pro (no credit card required)
- [ ] Stripe Checkout for subscription creation
- [ ] Webhook processing for subscription lifecycle events
- [ ] Paywall enforces limits correctly
- [ ] Subscription status synced to Supabase in real-time via webhook
- [ ] In-app upgrade prompt with social proof

**Backend Tasks:**
- `supabase/migrations/004_subscriptions.sql`
- `api/stripe/checkout/route.ts` — create Checkout session
- `api/stripe/portal/route.ts` — customer portal for subscription management
- `api/stripe/webhook/route.ts` — process events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- `src/lib/stripe/client.ts` — Stripe SDK initialization
- `src/lib/stripe/limits.ts` — feature limit enforcement

**Frontend Tasks:**
- `src/screens/paywall/PaywallScreen.tsx` — upgrade prompt with value props
- `src/components/paywall/PricingCard.tsx` — monthly/annual toggle
- `src/hooks/useSubscription.ts` — subscription state from Supabase
- `src/components/paywall/FeatureLock.tsx` — wrapper that shows upgrade prompt

**AI Notes:** N/A

**Security:**
- Webhook signature verification: `stripe.webhooks.constructEvent(rawBody, sig, secret)`
- Never trust client-reported subscription status — always read from Supabase (synced from Stripe)
- Rate limit checkout endpoint: 5 requests/minute per user

**QA Checklist:**
- [ ] Free user hits 7-entry limit → paywall shown
- [ ] Trial starts correctly with 14-day expiry
- [ ] Webhook processes subscription creation
- [ ] Webhook processes subscription cancellation (access revoked)
- [ ] Payment failure → subscription degraded to free
- [ ] Annual plan shows ~40% savings correctly

---

## EPIC-004: Growth & Notifications

**Milestone:** M4 | **Sprint:** 9–10 | **Labels:** `epic`, `notifications`, `viral-loop`

### ISSUE-011: Adaptive Notification System

**Priority:** P1 | **Points:** 5 | **Est:** 10h | **Labels:** `notifications`, `ai`, `retention`, `P1 - High`

**Objective:** AI-driven push notification system that sends the right message at the right time based on user behavior patterns.

**Acceptance Criteria:**
- [ ] OneSignal integrated for iOS + Android
- [ ] Notification types: streak reminder, insight ready, future self check-in, re-engagement
- [ ] Optimal send time learned per user (based on open history)
- [ ] A/B test notification copy using PostHog feature flags
- [ ] Opt-out respected and enforced
- [ ] Notification opens tracked in PostHog
- [ ] Deep links from notifications go to correct screen
- [ ] Never more than 2 notifications per day per user

**Backend Tasks:**
- `supabase/functions/send-notification/index.ts` — OneSignal API wrapper
- `api/cron/send-streak-reminders/route.ts` — daily 7pm cron
- `src/lib/notifications/scheduler.ts` — optimal time calculation
- `src/lib/notifications/templates.ts` — versioned notification copy

**AI Notes:**
- Notification copy generation: given user's last emotion + last insight + streak length → generate personalized push notification text (max 40 chars body, max 20 chars title)
- Optimal time model: simple frequency distribution of past open times, send ±30min of peak

---

### ISSUE-012: Viral Referral System

**Priority:** P2 | **Points:** 5 | **Est:** 8h | **Labels:** `viral-loop`, `backend`, `frontend`, `P2 - Medium`

**Objective:** "Share your Future Self" — users share a preview of their AI-generated future self prediction, driving organic installs.

**Acceptance Criteria:**
- [ ] User gets unique referral code on sign up
- [ ] "Share my Future Self" button generates OG image with AI prediction snippet
- [ ] Referral tracked: who referred who
- [ ] Referrer gets 1 free month Pro when referral converts to paid
- [ ] Referral link opens to custom landing page with preview
- [ ] 5 referrals = permanent 20% discount

**Backend Tasks:**
- `supabase/migrations/005_referrals.sql`
- `api/referral/share/route.ts` — generate OG image (via @vercel/og) with future self preview
- `api/referral/track/route.ts` — attribute install to referrer
- Vercel OG image: dark gradient, ECHO//SELF logo, 2-sentence future self quote

---

## EPIC-005: App Store Launch

**Milestone:** M5 | **Sprint:** 11–12 | **Labels:** `epic`, `mobile`

### ISSUE-013: iOS App Store Submission

**Priority:** P0 | **Points:** 5 | **Est:** 8h | **Labels:** `mobile`, `P0 - Critical`

See full checklist: [APP_STORE_CHECKLIST.md](../launch/APP_STORE_CHECKLIST.md)

### ISSUE-014: Google Play Submission

**Priority:** P0 | **Points:** 5 | **Est:** 8h | **Labels:** `mobile`, `P0 - Critical`

See full checklist: [GOOGLE_PLAY_CHECKLIST.md](../launch/GOOGLE_PLAY_CHECKLIST.md)

---

## EPIC-006: Performance & Scaling

**Milestone:** M6 | **Sprint:** ongoing | **Labels:** `epic`, `performance`, `infra`

### ISSUE-015: Performance Hardening (10k MAU)

**Priority:** P1 | **Points:** 8 | **Est:** 16h | **Labels:** `performance`, `database`, `P1 - High`

**Acceptance Criteria:**
- [ ] P99 read latency < 100ms for all API routes
- [ ] P99 write latency < 200ms for journal entry save
- [ ] AI streaming response starts < 800ms
- [ ] Database connection pooling via Supavisor
- [ ] IVFFlat indexes tuned for 1M+ embeddings
- [ ] CDN caching for static assets (Cloudflare)
- [ ] Vercel Analytics showing LCP < 2.5s, INP < 200ms
- [ ] Sentry p95 response time alerts configured

**Backend Tasks:**
- Add `EXPLAIN ANALYZE` to all critical query paths
- Configure Supavisor connection pooling
- Add DB indexes for: `journal_entries.user_id + created_at`, `memories.user_id + created_at`, `embeddings.user_id`
- Tune IVFFlat lists count based on actual embedding count
- Enable Vercel Speed Insights
- Configure Sentry performance monitoring with 10% sample rate
