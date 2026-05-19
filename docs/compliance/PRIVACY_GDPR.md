# Privacy & GDPR Compliance — ECHO//SELF

---

## Data Classification

| Category | Data | Sensitivity | Storage | Retention |
|---|---|---|---|---|
| Identity | Email, name, OAuth ID | High | Supabase Auth | Until deletion |
| Journal content | Text entries, voice recordings | Very High | Supabase DB / Storage | Until deletion |
| AI memories | Extracted facts about user | Very High | Supabase DB + pgvector | Until deletion |
| Identity graph | Values, fears, patterns | Very High | Supabase DB | Until deletion |
| Behavioral | App usage, streaks, session data | Medium | Supabase DB + PostHog | 2 years |
| Financial | Stripe customer ID, subscription status | High | Supabase DB + Stripe | 7 years (legal) |
| Analytics | Page views, events (no PII) | Low | PostHog (EU host) | 7 years |
| Crash reports | Stack traces (no user content) | Low | Sentry | 90 days |

---

## Legal Basis (GDPR Article 6)

| Processing Activity | Legal Basis |
|---|---|
| Auth, account management | Contract performance (Art. 6.1.b) |
| Journal entry storage | Contract performance (Art. 6.1.b) |
| AI memory extraction | Contract performance (Art. 6.1.b) |
| Analytics (PostHog) | Legitimate interest (Art. 6.1.f) |
| Push notifications | Consent (Art. 6.1.a) |
| Billing | Legal obligation (Art. 6.1.c) + Contract |
| Crash reporting | Legitimate interest (Art. 6.1.f) |

---

## Data Subject Rights (GDPR Chapter 3)

### Right of Access (Art. 15) — Export My Data

Users can request a full data export from Account Settings → Privacy → Export Data.

**What's included:**
- All journal entries (full text)
- All extracted memories
- Identity graph nodes
- Echo session transcripts
- Account information
- Subscription history

**Format:** JSON archive (email delivery within 72 hours)  
**Implementation:** Background job → Supabase `pg_dump` per user → encrypted ZIP → email link

### Right to Erasure (Art. 17) — Delete My Account

Users can delete their account from Account Settings → Privacy → Delete Account.

**What's deleted:**
- All journal entries (immediate)
- All memories and embeddings (immediate)
- All identity nodes and predictions (immediate)
- All Echo session transcripts (immediate)
- Auth account (immediate)
- OpenAI-processed data: covered by Enterprise API agreement
- Stripe customer data: anonymized after 7 years (legal retention)
- PostHog data: deleted within 30 days via API

**Implementation:**
```sql
-- Cascade delete all user data (RLS + ON DELETE CASCADE handles most)
DELETE FROM auth.users WHERE id = $user_id;
-- This cascades to: profiles, journal_entries, memories, identity_nodes,
-- echo_sessions, future_self_predictions, referrals, notification_preferences
```

**Timeline:** All non-financial data deleted within 24 hours. Financial data anonymized within 30 days.

### Right to Rectification (Art. 16)

Users can edit profile information (name, timezone) in Account Settings.  
Journal entries can be edited within 24 hours of creation.

### Right to Portability (Art. 20)

Same as Right of Access — JSON export available on demand.

### Right to Object (Art. 21)

Opt-out of:
- Analytics tracking: Account Settings → Privacy → Opt out of analytics
- Session recording: Account Settings → Privacy → Opt out of session recording
- Push notifications: in-app Notification Preferences

---

## Consent Management

### Push Notifications
- OS-level permission prompt — never pre-prompted
- In-app opt-out available at any time in Notification Preferences
- Stored in `notification_preferences` table

### Analytics
- PostHog initialized with `person_profiles: 'identified_only'`
- Only capture events for users who have signed in
- EU data host: `eu.i.posthog.com` (GDPR compliant)
- No cross-site tracking
- Sentry: `person_profiles: 'never'` — no PII in error reports

### Session Recordings
- Off by default
- All inputs masked (`maskAllInputs: true`)
- Journal content specifically excluded (`maskTextSelector: '[data-journal]'`)

---

## Data Residency

| Data | Location | Why |
|---|---|---|
| Database (Supabase) | US-East-1 | Supabase default (EU option available if needed) |
| Analytics (PostHog) | EU (eu.i.posthog.com) | GDPR compliance |
| Error tracking (Sentry) | US | Standard Sentry |
| Payments (Stripe) | US | Stripe infrastructure |
| CDN/Edge (Vercel) | Global | Edge network |

**GDPR Note:** US-based storage is covered by:
- Standard Contractual Clauses (SCCs) with Supabase
- Sentry's DPA
- Stripe's DPA

**EU users:** Add Supabase EU region option if EU user base > 30% of total.

---

## Privacy by Design Checklist

- [ ] Journal content never sent to third-party analytics (PostHog)
- [ ] Email stripped from Sentry error reports
- [ ] No cross-app tracking identifiers
- [ ] Data minimization: only collect what AI processing requires
- [ ] OpenAI: Enterprise API = data not used for training
- [ ] Audio recordings deleted after transcription
- [ ] Embedding vectors are not reversible to original text (one-way transformation)
- [ ] Referral tracking uses opaque codes (not email or user ID in URL)

---

## Privacy Policy Requirements

The Privacy Policy must cover:
1. What data is collected and why
2. How AI processes user data
3. Third parties (OpenAI, Stripe, PostHog, Sentry, OneSignal)
4. User rights (export, deletion, correction)
5. Data retention periods
6. Contact information: privacy@echoself.app
7. Effective date + version number
8. GDPR controller information (if EU users)

**URL:** echoself.app/privacy  
**Last updated:** Must be updated when data practices change

---

## CCPA Compliance (California)

- "Do Not Sell My Personal Information" — we do NOT sell data. State this explicitly.
- Data export available on request (same as GDPR Art. 15)
- Deletion available on request (same as GDPR Art. 17)
- Contact: privacy@echoself.app

---

## Children's Privacy (COPPA)

- Minimum age: 17 years (enforced via App Store age rating + ToS)
- No knowingly collecting data from users under 13
- Age verification: user attestation during sign-up
