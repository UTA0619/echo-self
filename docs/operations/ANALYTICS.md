# Analytics Plan — ECHO//SELF

**Tools:** PostHog (primary), Vercel Analytics (traffic), Vercel Speed Insights (performance)

---

## Analytics Stack

| Tool | Purpose | Data Retention |
|---|---|---|
| PostHog | Product analytics, funnels, cohorts, feature flags, A/B tests | 7 years |
| Vercel Analytics | Page views, traffic sources, countries | 30 days |
| Vercel Speed Insights | Core Web Vitals, LCP, INP, CLS | 30 days |
| Sentry Performance | Error rates, API latency, traces | 90 days |

---

## PostHog Setup

```typescript
// src/lib/analytics/posthog.ts
import posthog from 'posthog-js'

export function initPostHog() {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // EU host for GDPR
    person_profiles: 'identified_only',  // GDPR: no anon profiles by default
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true,  // Never record journal content
      maskTextSelector: '[data-sensitive]',
    },
    loaded: (ph) => {
      if (process.env.NEXT_PUBLIC_APP_ENV !== 'production') {
        ph.opt_out_capturing()  // No analytics in dev/preview
      }
    },
  })
}

export function identify(userId: string, properties: Record<string, any>) {
  posthog.identify(userId, properties)
}

export function track(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties)
}

export function reset() {
  posthog.reset()
}
```

---

## User Identification

```typescript
// On auth state change
posthog.identify(user.id, {
  email: user.email,
  plan: subscription.plan,
  streak: profile.current_streak,
  total_entries: profile.total_entries,
  created_at: user.created_at,
  days_since_signup: differenceInDays(new Date(), new Date(user.created_at)),
})
```

---

## Event Taxonomy

### Onboarding Events

| Event | Properties | Trigger |
|---|---|---|
| `onboarding_started` | `referral_source`, `device_type` | Onboarding step 1 shown |
| `onboarding_step_completed` | `step: 1-5`, `time_on_step` | Each step completed |
| `onboarding_skipped` | `step`, `reason` | User taps Skip |
| `onboarding_completed` | `total_time_seconds`, `steps_skipped` | Step 5 AI response shown |

### Journal Events

| Event | Properties | Trigger |
|---|---|---|
| `journal_entry_started` | `method: text|voice`, `prompt_shown` | Text field focused |
| `journal_entry_saved` | `word_count`, `method`, `entry_number` | Entry auto-saved |
| `journal_entry_ai_processed` | `emotions_detected`, `memories_extracted`, `processing_time_ms` | AI processing complete |
| `ai_response_opened` | `entry_id` | "How does this land?" tapped |
| `journal_entry_deleted` | — | Entry deleted |

### Echo Session Events

| Event | Properties | Trigger |
|---|---|---|
| `echo_session_started` | `session_number`, `time_of_day`, `streak_length` | Session initiated |
| `echo_message_sent` | `session_id`, `word_count` | User sends message |
| `echo_session_completed` | `session_id`, `duration_seconds`, `message_count`, `theme` | Session ended |
| `echo_session_abandoned` | `session_id`, `duration_seconds`, `message_count` | App closed mid-session |
| `echo_session_deepened` | `session_id` | "Go deeper" tapped |

### Identity Events

| Event | Properties | Trigger |
|---|---|---|
| `identity_graph_viewed` | `node_count`, `days_since_signup` | Identity screen opened |
| `identity_node_tapped` | `node_type`, `node_label` | Node tapped |
| `identity_node_challenged` | `node_id`, `node_type` | User challenges node |
| `future_self_viewed` | `timeframe: 30d|90d|365d` | Prediction viewed |

### Monetization Events

| Event | Properties | Trigger |
|---|---|---|
| `paywall_shown` | `trigger: entry_limit|session_limit|feature_gate`, `feature_attempted` | Paywall displays |
| `paywall_dismissed` | `trigger` | User dismisses paywall |
| `upgrade_tapped` | `trigger`, `plan_shown` | CTA tapped |
| `checkout_started` | `plan: monthly|annual`, `from_trial` | Stripe Checkout opened |
| `subscription_started` | `plan`, `is_trial` | Checkout completed |
| `subscription_canceled` | `plan`, `days_active`, `reason` | Subscription canceled |
| `subscription_reactivated` | `plan` | Lapsed user re-subscribes |

### Notification Events

| Event | Properties | Trigger |
|---|---|---|
| `notification_permission_requested` | — | Permission prompt shown |
| `notification_permission_granted` | — | User allows |
| `notification_permission_denied` | — | User denies |
| `notification_opened` | `notification_type`, `send_time`, `response_time_minutes` | Push opened |
| `notification_ignored` | `notification_type` | Not opened within 4 hours |

### Growth Events

| Event | Properties | Trigger |
|---|---|---|
| `referral_link_created` | — | User first views referral screen |
| `referral_shared` | `channel: native_share|copy` | Share tapped |
| `referral_converted` | `referrer_id` | Referred user subscribes |
| `streak_achieved` | `streak_length: 7|30|100` | Milestone hit |
| `app_review_prompted` | — | Review prompt shown |
| `app_review_given` | `rating` | User rates in App Store |

---

## Funnels to Build in PostHog

### 1. Activation Funnel
```
Sign Up → Onboarding Complete → First Journal Entry → First AI Emotion → First Echo Session
```
Target: 60% from sign up → first echo session

### 2. Conversion Funnel
```
Free User → Paywall Shown → Upgrade Tapped → Checkout Started → Pro Active
```
Target: 8% free → pro

### 3. Onboarding Funnel
```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Complete
```
Target: 75% completion rate

### 4. Notification Opt-in Funnel
```
Permission Requested → Granted
```
Target: 55% opt-in

---

## Cohort Definitions

| Cohort | Definition | Purpose |
|---|---|---|
| Power Users | ≥ 3 Echo sessions in last 7 days | Identify advocates |
| At Risk | 0 entries in last 7 days | Re-engagement target |
| High Conversion | Free users who hit usage limit | Paywall messaging |
| Champions | Referred ≥ 3 users | Reward program |
| New Subscribers | Pro < 14 days | Activation check |

---

## Vercel Analytics Integration

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Track business events
import { track } from '@vercel/analytics'

// In API routes (server-side events)
import { track as trackServer } from '@vercel/analytics/server'
await trackServer('subscription_started', { plan: 'pro' })
```

---

## A/B Tests (PostHog Feature Flags)

| Test | Variants | Metric |
|---|---|---|
| Paywall copy | Control vs "Join 10,000 people discovering themselves" | `checkout_started` |
| Notification tone | Gentle vs Direct | `notification_opened` |
| Onboarding length | 5 steps vs 3 steps | `onboarding_completed` + D7 retention |
| Pro price point | $12.99 vs $9.99 | Revenue per user |

---

## Dashboard: Key Metrics to Monitor Daily

1. New sign-ups
2. D1 / D7 / D30 retention (cohort)
3. Free → Pro conversion rate (last 30 days)
4. Echo sessions / DAU
5. Paywall shown → upgrade rate
6. Notification open rate
7. MRR (from Stripe)
8. Churn rate (30-day rolling)
