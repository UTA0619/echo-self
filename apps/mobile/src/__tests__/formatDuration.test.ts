/**
 * Tests for the formatDuration utility used in VoiceInputButton.
 * Extracted here to keep tests framework-agnostic (no RN rendering needed).
 */

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

describe('formatDuration', () => {
  it('formats zero ms as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('formats 1 second correctly', () => {
    expect(formatDuration(1000)).toBe('0:01')
  })

  it('formats 9 seconds with leading zero', () => {
    expect(formatDuration(9000)).toBe('0:09')
  })

  it('formats 1 minute exactly', () => {
    expect(formatDuration(60_000)).toBe('1:00')
  })

  it('formats 1 minute 30 seconds', () => {
    expect(formatDuration(90_000)).toBe('1:30')
  })

  it('formats 5 minutes 5 seconds', () => {
    expect(formatDuration(305_000)).toBe('5:05')
  })

  it('truncates sub-second precision (floor)', () => {
    expect(formatDuration(1999)).toBe('0:01')
    expect(formatDuration(59_999)).toBe('0:59')
  })

  it('handles 10 minutes', () => {
    expect(formatDuration(600_000)).toBe('10:00')
  })
})
