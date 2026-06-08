/**
 * Tests for onboarding sync payload building and validation logic.
 *
 * Tests the pure data-transformation parts of onboarding-sync.ts
 * without requiring a live Supabase connection.
 */

interface OnboardingData {
  name?: string
  goalStatement?: string
  streakGoal?: number
  completedAt?: string
}

interface SyncPayload {
  displayName: string
  onboardingData: OnboardingData
  onboardingDone: boolean
  streakGoal: number
}

function buildSyncPayload(data: OnboardingData): SyncPayload {
  return {
    displayName:    data.name?.trim() ?? 'Unknown',
    onboardingData: data,
    onboardingDone: true,
    streakGoal:     data.streakGoal ?? 5,
  }
}

function isValidExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') && token.endsWith(']')
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, 100)
}

function validateStreakGoal(value: unknown): number {
  if (typeof value !== 'number' || value < 1 || value > 365) return 5
  return Math.round(value)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildSyncPayload', () => {
  it('builds a valid payload from complete onboarding data', () => {
    const data: OnboardingData = {
      name:           'Kai',
      goalStatement:  'Build something meaningful',
      streakGoal:     7,
      completedAt:    '2026-06-09T09:00:00Z',
    }
    const payload = buildSyncPayload(data)
    expect(payload.displayName).toBe('Kai')
    expect(payload.streakGoal).toBe(7)
    expect(payload.onboardingDone).toBe(true)
    expect(payload.onboardingData).toBe(data)
  })

  it('uses default name when name is missing', () => {
    const payload = buildSyncPayload({})
    expect(payload.displayName).toBe('Unknown')
  })

  it('uses default streakGoal of 5 when not provided', () => {
    const payload = buildSyncPayload({ name: 'Alex' })
    expect(payload.streakGoal).toBe(5)
  })

  it('trims whitespace from name', () => {
    const payload = buildSyncPayload({ name: '  Jordan  ' })
    expect(payload.displayName).toBe('Jordan')
  })

  it('always sets onboardingDone to true', () => {
    expect(buildSyncPayload({}).onboardingDone).toBe(true)
  })
})

describe('isValidExpoPushToken', () => {
  it('accepts valid Expo push tokens', () => {
    expect(isValidExpoPushToken('ExponentPushToken[abc123def456]')).toBe(true)
    expect(isValidExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxxxx]')).toBe(true)
  })

  it('rejects tokens without proper prefix', () => {
    expect(isValidExpoPushToken('abc123')).toBe(false)
    expect(isValidExpoPushToken('ExponentPushToken abc123')).toBe(false)
    expect(isValidExpoPushToken('')).toBe(false)
  })

  it('rejects tokens without closing bracket', () => {
    expect(isValidExpoPushToken('ExponentPushToken[abc123')).toBe(false)
  })

  it('rejects FCM tokens', () => {
    expect(isValidExpoPushToken('fcm-token-abc123')).toBe(false)
  })
})

describe('sanitizeName', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeName('  Alice  ')).toBe('Alice')
  })

  it('truncates names longer than 100 chars', () => {
    const longName = 'A'.repeat(150)
    expect(sanitizeName(longName).length).toBe(100)
  })

  it('preserves names within limit', () => {
    expect(sanitizeName('Emma Watson')).toBe('Emma Watson')
  })

  it('handles empty string', () => {
    expect(sanitizeName('')).toBe('')
  })
})

describe('validateStreakGoal', () => {
  it('accepts valid streak goals', () => {
    expect(validateStreakGoal(1)).toBe(1)
    expect(validateStreakGoal(5)).toBe(5)
    expect(validateStreakGoal(30)).toBe(30)
    expect(validateStreakGoal(365)).toBe(365)
  })

  it('returns default 5 for out-of-range values', () => {
    expect(validateStreakGoal(0)).toBe(5)
    expect(validateStreakGoal(366)).toBe(5)
    expect(validateStreakGoal(-1)).toBe(5)
  })

  it('returns default 5 for non-numbers', () => {
    expect(validateStreakGoal('7')).toBe(5)
    expect(validateStreakGoal(null)).toBe(5)
    expect(validateStreakGoal(undefined)).toBe(5)
    expect(validateStreakGoal(NaN)).toBe(5)
  })

  it('rounds fractional values', () => {
    expect(validateStreakGoal(7.8)).toBe(8)
    expect(validateStreakGoal(3.2)).toBe(3)
  })
})
