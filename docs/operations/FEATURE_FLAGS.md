# Feature Flag Strategy — ECHO//SELF

**Tool:** PostHog Feature Flags

---

## Why Feature Flags

- Ship code without releasing features
- Instant kill switch for broken features (no deploy needed)
- A/B test new experiences
- Gradual rollouts (1% → 10% → 100%)
- Beta user programs

---

## Flag Categories

### Kill Switches (always exists)
Flags that can disable a feature instantly without a deploy.

| Flag | Default | Description |
|---|---|---|
| `ai-processing-enabled` | true | Master switch for all AI processing |
| `echo-sessions-enabled` | true | Kill Echo sessions if OpenAI has issues |
| `voice-input-enabled` | true | Kill Whisper if costs spike |
| `notifications-enabled` | true | Kill all push notifications |
| `stripe-enabled` | true | Kill payment processing |

### Gradual Rollouts
Features being rolled out incrementally.

| Flag | Rollout | Description |
|---|---|---|
| `future-self-v2` | 0% | Redesigned future self UI |
| `identity-graph-visual` | 50% | Graph visualization on Identity screen |
| `echo-session-voice-mode` | 10% | Voice input during Echo sessions |
| `ai-daily-insight-push` | 100% | Daily insight push notification |

### A/B Tests
Active experiments.

| Flag | Variants | Metric |
|---|---|---|
| `paywall-copy-test` | control / variant_a / variant_b | `checkout_started` rate |
| `notification-tone` | gentle / direct | `notification_opened` rate |
| `onboarding-length` | 5_steps / 3_steps | D7 retention |

---

## Implementation

```typescript
// src/lib/flags.ts
import posthog from 'posthog-js'

export async function isEnabled(
  flagKey: string,
  defaultValue: boolean = false
): Promise<boolean> {
  try {
    const value = posthog.isFeatureEnabled(flagKey)
    return value ?? defaultValue
  } catch {
    return defaultValue  // fail open for kill switches, fail closed for features
  }
}

export async function getFlagVariant(
  flagKey: string
): Promise<string | boolean | null> {
  try {
    return posthog.getFeatureFlagPayload(flagKey) as string ?? null
  } catch {
    return null
  }
}
```

```typescript
// Usage in component
const echoEnabled = await isEnabled('echo-sessions-enabled', true)
if (!echoEnabled) {
  return <FeatureUnavailable message="Echo sessions are temporarily unavailable." />
}
```

```typescript
// Usage in API route
const aiEnabled = await isEnabled('ai-processing-enabled', true)
if (!aiEnabled) {
  return Response.json({ status: 'queued', message: 'AI processing temporarily paused' })
}
```

---

## Server-Side Flag Evaluation

For API routes and server components, use PostHog server-side SDK:

```typescript
import { PostHog } from 'posthog-node'

const serverPostHog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
})

// In API route
const isEnabled = await serverPostHog.isFeatureEnabled('echo-sessions-enabled', userId)
```

---

## Flag Governance

- **Creating a flag:** Document in this file. Define rollout plan and success metric.
- **Archiving a flag:** Remove code references first, then delete flag in PostHog.
- **Never:** Nest flag checks > 2 levels deep. Keep flag logic at the screen/API layer.
- **Always:** Have a `defaultValue` that represents the safe fallback state.

---

## Rollout Protocol

1. **0%** — Flag created, code ships to production, no users see feature
2. **5%** — Internal team + beta users only
3. **20%** — Broader test, watch error rates and metrics
4. **50%** — A/B test (if applicable)
5. **100%** — Full rollout
6. **Archived** — Flag removed from code + PostHog

Minimum time between steps: 48 hours (enough time to detect regressions).
