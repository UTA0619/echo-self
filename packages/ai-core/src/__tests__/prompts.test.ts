/**
 * Unit tests for ai-core prompt builders.
 * Pure TypeScript — no framework, no HTTP calls.
 */

import { buildBehavioralTagPrompt, BEHAVIORAL_TAG_TAXONOMY } from '../prompts/behavioral-tag'
import { buildDailyInsightPrompt, buildDailyInsightSystemPrompt } from '../prompts/daily-insight'

// ─── behavioral-tag ────────────────────────────────────────────────────────────

describe('buildBehavioralTagPrompt', () => {
  const baseParams = {
    content: 'I felt overwhelmed today at work but pushed through the difficult meetings.',
    userName: 'Alex',
  }

  it('includes the journal content in the prompt', () => {
    const prompt = buildBehavioralTagPrompt(baseParams)
    expect(prompt).toContain(baseParams.content)
  })

  it('includes the user name', () => {
    const prompt = buildBehavioralTagPrompt(baseParams)
    expect(prompt).toContain('Alex')
  })

  it('includes taxonomy tags', () => {
    const prompt = buildBehavioralTagPrompt(baseParams)
    // Should reference at least some taxonomy tags
    expect(prompt).toContain('growth-mindset')
    expect(prompt).toContain('burnout')
    expect(prompt).toContain('resilience')
  })

  it('specifies JSON output format', () => {
    const prompt = buildBehavioralTagPrompt(baseParams)
    expect(prompt).toContain('"tags"')
    expect(prompt).toContain('"dominant_theme"')
    expect(prompt).toContain('"growth_indicators"')
    expect(prompt).toContain('"risk_indicators"')
  })

  it('includes existing tags when provided', () => {
    const prompt = buildBehavioralTagPrompt({
      ...baseParams,
      existingTags: ['resilience', 'ambitious'],
    })
    expect(prompt).toContain('resilience')
    expect(prompt).toContain('ambitious')
  })

  it('falls back to "the user" when no userName provided', () => {
    const prompt = buildBehavioralTagPrompt({ content: 'Today was hard.' })
    expect(prompt).toContain('the user')
  })
})

describe('BEHAVIORAL_TAG_TAXONOMY', () => {
  it('contains at least 30 unique tags', () => {
    expect(BEHAVIORAL_TAG_TAXONOMY.length).toBeGreaterThanOrEqual(30)
    const unique = new Set(BEHAVIORAL_TAG_TAXONOMY)
    expect(unique.size).toBe(BEHAVIORAL_TAG_TAXONOMY.length)
  })

  it('contains no spaces (tags use hyphens)', () => {
    BEHAVIORAL_TAG_TAXONOMY.forEach(tag => {
      expect(tag).not.toContain(' ')
    })
  })

  it('contains key behavioral categories', () => {
    const tags = new Set(BEHAVIORAL_TAG_TAXONOMY)
    expect(tags.has('growth-mindset')).toBe(true)
    expect(tags.has('burnout')).toBe(true)
    expect(tags.has('resilience')).toBe(true)
    expect(tags.has('authenticity')).toBe(true)
    expect(tags.has('procrastination')).toBe(true)
  })
})

// ─── daily-insight ─────────────────────────────────────────────────────────────

describe('buildDailyInsightPrompt', () => {
  const baseParams = {
    userName: 'Maya',
    recentMemories: [
      'Felt anxious about the presentation but delivered it well.',
      'Had a long walk and noticed my mind quietening.',
      'Struggled to focus in the afternoon — too many tabs open.',
    ],
    emotionArc: 'fear → trust → joy',
    topTags: ['growth-mindset', 'resilience', 'distracted'],
    streakDays: 14,
  }

  it('includes the user name', () => {
    const prompt = buildDailyInsightPrompt(baseParams)
    expect(prompt).toContain('Maya')
  })

  it('includes recent memories', () => {
    const prompt = buildDailyInsightPrompt(baseParams)
    expect(prompt).toContain('anxious about the presentation')
  })

  it('includes emotion arc', () => {
    const prompt = buildDailyInsightPrompt(baseParams)
    expect(prompt).toContain('fear → trust → joy')
  })

  it('includes behavioral tags', () => {
    const prompt = buildDailyInsightPrompt(baseParams)
    expect(prompt).toContain('growth-mindset')
  })

  it('mentions streak when provided', () => {
    const prompt = buildDailyInsightPrompt(baseParams)
    expect(prompt).toContain('14')
  })

  it('specifies notification-length constraint', () => {
    const prompt = buildDailyInsightPrompt(baseParams)
    expect(prompt).toContain('160')
  })

  it('specifies JSON output format', () => {
    const prompt = buildDailyInsightPrompt(baseParams)
    expect(prompt).toContain('"insight"')
    expect(prompt).toContain('"push_title"')
  })

  it('handles empty memories gracefully', () => {
    const prompt = buildDailyInsightPrompt({ ...baseParams, recentMemories: [] })
    expect(prompt).toContain('no memories yet')
  })

  it('handles streak ≥ 7 callout', () => {
    const prompt = buildDailyInsightPrompt({ ...baseParams, streakDays: 30 })
    expect(prompt).toContain('streak')
  })
})

describe('buildDailyInsightSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildDailyInsightSystemPrompt()
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(50)
  })

  it('mentions ECHO', () => {
    expect(buildDailyInsightSystemPrompt()).toContain('ECHO')
  })
})
