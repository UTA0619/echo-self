# QA Testing Strategy — ECHO//SELF

---

## Testing Philosophy

Test behavior, not implementation. Every test should answer: "Does this feature work for the user?" — not "Does this function return the right value?"

---

## Test Stack

| Type | Tool | Location | Run |
|---|---|---|---|
| Unit | Vitest | `src/**/*.test.ts` | `npm test` |
| Integration | Vitest + Supabase local | `src/**/*.integration.test.ts` | `npm run test:integration` |
| E2E | Playwright | `e2e/**/*.spec.ts` | `npm run test:e2e` |
| AI Eval | Custom eval harness | `evals/**/*.eval.ts` | `npm run eval:prompts` |
| Visual | Playwright screenshots | `e2e/visual/**` | `npm run test:visual` |
| Load | k6 | `load-tests/**/*.js` | `npm run test:load` |

---

## Coverage Targets

| Layer | Minimum | Target |
|---|---|---|
| Utils & lib functions | 80% | 90% |
| React hooks | 70% | 80% |
| API route handlers | 60% | 80% |
| AI prompt logic | Manual eval | 85%+ pass rate |

---

## Unit Test Examples

```typescript
// src/lib/stripe/limits.test.ts
describe('checkFeatureAccess', () => {
  it('allows pro users unlimited journal entries', async () => {
    const sub = makeSub({ plan: 'pro', status: 'active', entries_this_month: 100 })
    const result = await checkFeatureAccess('user-id', 'journal_entries_per_month', sub)
    expect(result.allowed).toBe(true)
  })

  it('blocks free users at 7 entries', async () => {
    const sub = makeSub({ plan: 'free', entries_this_month: 7 })
    const result = await checkFeatureAccess('user-id', 'journal_entries_per_month', sub)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('upgrade')
  })

  it('blocks free users from identity graph', async () => {
    const sub = makeSub({ plan: 'free' })
    const result = await checkFeatureAccess('user-id', 'identity_graph', sub)
    expect(result.allowed).toBe(false)
  })
})
```

```typescript
// src/lib/memory/deduplication.test.ts
describe('deduplicateMemories', () => {
  it('merges memories with > 0.95 cosine similarity', async () => {
    const existing = createMemory({ content: 'The user fears abandonment deeply' })
    const duplicate = createMemory({ content: 'The user has a deep fear of abandonment' })

    await deduplicateMemories(userId, duplicate.id)

    const remaining = await getMemories(userId)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].reinforcement_count).toBe(2)
  })
})
```

---

## Integration Tests

Integration tests run against local Supabase. They test the full stack — DB, RLS, and business logic together.

```typescript
// src/lib/auth/rls.integration.test.ts
describe('Row Level Security', () => {
  it('prevents user A from reading user B journal entries', async () => {
    const userA = await createTestUser()
    const userB = await createTestUser()

    const entry = await createJournalEntry(userB.id, 'Private thoughts')

    // Query as user A
    const { data, error } = await supabaseAs(userA).from('journal_entries')
      .select('*')
      .eq('id', entry.id)
      .single()

    expect(data).toBeNull()
    expect(error?.code).toBe('PGRST116')  // Not found (RLS filtered)
  })

  it('allows users to read their own memories', async () => {
    const user = await createTestUser()
    const memory = await createMemory(user.id, 'Test memory')

    const { data } = await supabaseAs(user).from('memories')
      .select('*').eq('id', memory.id).single()

    expect(data?.id).toBe(memory.id)
  })
})
```

---

## E2E Tests

```typescript
// e2e/auth.spec.ts
test.describe('Authentication', () => {
  test('user can sign up with email @smoke', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.fill('[name=email]', testEmail())
    await page.fill('[name=password]', 'TestPassword123!')
    await page.click('[type=submit]')
    await expect(page).toHaveURL('/onboarding')
    await expect(page.locator('text=Welcome')).toBeVisible()
  })

  test('user can complete onboarding and reach home @smoke', async ({ page }) => {
    await signUpAndLogin(page)
    await completeOnboarding(page)
    await expect(page).toHaveURL('/home')
    await expect(page.locator('[data-testid=home-prompt]')).toBeVisible()
  })
})
```

```typescript
// e2e/journal.spec.ts
test.describe('Journal', () => {
  test('user can write and save a journal entry @smoke', async ({ page }) => {
    await signInAndGoHome(page)
    await page.click('[data-testid=journal-button]')
    await page.fill('[data-testid=journal-input]', 'Today I felt incredibly present during my morning walk.')
    await page.waitForTimeout(3500)  // auto-save delay

    // Emotion tags should appear after AI processing
    await expect(page.locator('[data-testid=emotion-chip]')).toBeVisible({ timeout: 10_000 })
  })
})
```

---

## AI Eval Framework

```typescript
// evals/emotion-analysis.eval.ts
const TEST_CASES = [
  {
    input: "I cried in the car today and I don't even know why. Something about the song.",
    expected: { primary: 'sadness', minIntensity: 0.6 }
  },
  {
    input: "Crushed my presentation today. Everyone was engaged.",
    expected: { primary: 'joy', minIntensity: 0.7 }
  },
  {
    input: "Had another argument with my sister about mom. So tired of it.",
    expected: { primary: 'anger', valence: { max: -0.3 } }
  },
]

async function runEmotionEvals() {
  let pass = 0
  for (const tc of TEST_CASES) {
    const result = await analyzeEmotion(tc.input)
    const correct = result.primary.emotion === tc.expected.primary
      && result.primary.intensity >= (tc.expected.minIntensity ?? 0)
    if (correct) pass++
    console.log(`[${correct ? 'PASS' : 'FAIL'}] ${tc.input.slice(0, 50)}...`)
  }
  console.log(`\nResult: ${pass}/${TEST_CASES.length} (${Math.round(pass/TEST_CASES.length*100)}%)`)
  if (pass / TEST_CASES.length < 0.85) process.exit(1)
}
```

---

## QA Sign-off Checklist (Pre-Launch)

### Core Flows

- [ ] Sign up (email) → onboarding → home
- [ ] Sign up (Apple) → onboarding → home
- [ ] Sign in → session persists after app restart
- [ ] Write journal entry → emotions appear → memory extracted
- [ ] Voice journal entry → transcription accurate
- [ ] Start Echo session → AI responds → session ends with insight
- [ ] View identity graph (Pro)
- [ ] View future self predictions (Pro)
- [ ] Hit free tier limit → paywall shown → upgrade → paywall gone
- [ ] Cancel subscription → access revoked at period end
- [ ] Notification received → tapping opens correct screen
- [ ] Referral link shared → new user signs up → referrer sees credit

### Device Coverage

| Device | iOS | Android | Web |
|---|---|---|---|
| Latest iPhone (15 Pro) | ✅ | — | — |
| Mid-range (iPhone 12) | ✅ | — | — |
| iPhone SE (small screen) | ✅ | — | — |
| Samsung Galaxy S24 | — | ✅ | — |
| Pixel 7 | — | ✅ | — |
| Desktop Chrome | — | — | ✅ |

### Edge Cases

- [ ] Offline mode — entry queues for sync
- [ ] App killed mid-Echo session — session resumes
- [ ] OpenAI timeout — graceful fallback shown
- [ ] Expired subscription mid-session — graceful degradation
- [ ] RLS: User A cannot access User B data (automated + manual verify)
- [ ] New user (0 memories) — Echo session works with onboarding context

---

## Load Testing

```javascript
// load-tests/journal-entry.js (k6)
import http from 'k6/http'
import { sleep } from 'k6'

export const options = {
  vus: 100,           // 100 concurrent users
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(99)<500'],   // Journal save < 500ms
    http_req_failed: ['rate<0.01'],     // < 1% error rate
  },
}

export default function () {
  const res = http.post('https://echoself.app/api/journal', JSON.stringify({
    content: 'Load test journal entry ' + Math.random()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TEST_JWT}`,
    }
  })
  sleep(1)
}
```

Run before any major release with real production-scale data.
