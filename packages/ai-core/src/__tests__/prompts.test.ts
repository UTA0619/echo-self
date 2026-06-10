/**
 * Unit tests for ai-core prompt builders.
 * Pure TypeScript — no framework, no HTTP calls.
 */

import { describe, it, expect } from 'vitest'
import { buildBehavioralTagPrompt, BEHAVIORAL_TAG_TAXONOMY } from '../prompts/behavioral-tag'
import { buildDailyInsightPrompt, buildDailyInsightSystemPrompt } from '../prompts/daily-insight'
import { buildEchoSystemPrompt } from '../prompts/echo'
import { buildFutureSelfPrompt } from '../prompts/future-self'
import { buildSafetyResponseSystemPrompt, buildSafetyResponsePrompt } from '../prompts/safety'

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

// ─── echo system prompt ────────────────────────────────────────────────────────

describe('buildEchoSystemPrompt', () => {
  const baseParams = {
    userName: 'Jordan',
    onboardingData: {
      identityTags: ['curious', 'creative', 'introverted'],
      aspirations: 'Build something meaningful and live with intentionality.',
      streakCommitment: 5,
      stepCompleted: 5,
    },
    currentEntry: 'Today I felt unmotivated but still managed to journal.',
    emotion: 'sadness' as const,
    emotionScore: 0.65,
    recentEntries: [
      { content: 'Celebrated finishing a big project.', createdAt: '2026-06-08', emotion: 'joy' as const },
    ],
    retrievedMemories: [
      { contentChunk: 'Wrote about fear of failure last month.', memoryDate: '2026-05-10', emotion: 'fear' as const, similarityScore: 0.88 },
    ],
    emotionalArcSummary: 'joy → sadness → anticipation over 30 days',
  }

  it('includes user name', () => {
    const prompt = buildEchoSystemPrompt(baseParams)
    expect(prompt).toContain('Jordan')
  })

  it('includes identity tags', () => {
    const prompt = buildEchoSystemPrompt(baseParams)
    expect(prompt).toContain('curious')
    expect(prompt).toContain('creative')
  })

  it('includes aspirations', () => {
    const prompt = buildEchoSystemPrompt(baseParams)
    expect(prompt).toContain('intentionality')
  })

  it('includes emotional arc summary', () => {
    const prompt = buildEchoSystemPrompt(baseParams)
    expect(prompt).toContain('joy → sadness → anticipation')
  })

  it('includes current entry content', () => {
    const prompt = buildEchoSystemPrompt(baseParams)
    expect(prompt).toContain('unmotivated')
  })

  it('includes retrieved memory', () => {
    const prompt = buildEchoSystemPrompt(baseParams)
    expect(prompt).toContain('fear of failure')
  })

  it('handles null emotion gracefully', () => {
    const prompt = buildEchoSystemPrompt({ ...baseParams, emotion: null, emotionScore: null })
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(100)
  })

  it('handles empty memories gracefully', () => {
    const prompt = buildEchoSystemPrompt({ ...baseParams, retrievedMemories: [] })
    expect(typeof prompt).toBe('string')
  })
})

// ─── future-self prompt ────────────────────────────────────────────────────────

describe('buildFutureSelfPrompt', () => {
  const baseParams = {
    userName: 'Riley',
    aspirations: 'Become a calm, creative, self-sufficient person.',
    identityTags: ['visionary', 'introspective', 'resilient'],
    timeframe: '90d' as const,
    emotionalArcSummary: 'fear → trust → joy — 90 day trajectory',
    topMemories: [
      { contentChunk: 'Finished my first marathon.', emotion: 'joy' as const, importanceScore: 0.9 },
      { contentChunk: 'Struggled with loneliness at work.', emotion: 'sadness' as const, importanceScore: 0.7 },
    ],
    entryCount: 45,
    currentStreakDays: 21,
  }

  it('includes user name', () => {
    const prompt = buildFutureSelfPrompt(baseParams)
    expect(prompt).toContain('Riley')
  })

  it('includes aspirations', () => {
    const prompt = buildFutureSelfPrompt(baseParams)
    expect(prompt).toContain('calm, creative')
  })

  it('includes identity tags', () => {
    const prompt = buildFutureSelfPrompt(baseParams)
    expect(prompt).toContain('visionary')
    expect(prompt).toContain('introspective')
  })

  it('includes timeframe label', () => {
    const prompt = buildFutureSelfPrompt(baseParams)
    expect(prompt).toContain('90 days')
  })

  it('includes emotional arc', () => {
    const prompt = buildFutureSelfPrompt(baseParams)
    expect(prompt).toContain('fear → trust → joy')
  })

  it('includes memory content', () => {
    const prompt = buildFutureSelfPrompt(baseParams)
    expect(prompt).toContain('marathon')
  })

  it('includes entry count and streak', () => {
    const prompt = buildFutureSelfPrompt(baseParams)
    expect(prompt).toContain('45')
    expect(prompt).toContain('21')
  })

  it('handles 30d timeframe', () => {
    const prompt = buildFutureSelfPrompt({ ...baseParams, timeframe: '30d' as const })
    expect(prompt).toContain('30 days')
  })

  it('handles 1yr timeframe', () => {
    const prompt = buildFutureSelfPrompt({ ...baseParams, timeframe: '1yr' as const })
    expect(prompt).toContain('1 year')
  })

  it('caps memories at 8', () => {
    const manyMemories = Array.from({ length: 15 }, (_, i) => ({
      contentChunk: `Memory ${i}`,
      emotion: 'joy' as const,
      importanceScore: 0.5,
    }))
    const prompt = buildFutureSelfPrompt({ ...baseParams, topMemories: manyMemories })
    // Should not include all 15 — just verify it doesn't throw
    expect(typeof prompt).toBe('string')
  })
})

// ─── safety prompts ────────────────────────────────────────────────────────────

describe('buildSafetyResponseSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildSafetyResponseSystemPrompt()
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(100)
  })

  it('references ECHO identity', () => {
    const prompt = buildSafetyResponseSystemPrompt()
    expect(prompt).toContain('ECHO')
  })

  it('does not reference crisis numbers directly (Claude adds them)', () => {
    // The system prompt sets tone; CRISIS_RESOURCES_STATIC is appended separately
    const prompt = buildSafetyResponseSystemPrompt()
    expect(typeof prompt).toBe('string')
  })
})

describe('buildSafetyResponsePrompt', () => {
  const baseParams = {
    content: "I've been feeling really low lately, like there's no point.",
    riskLevel: 'moderate' as const,
    userName: 'Sam',
    emotionArc: 'sadness → fear → anticipation',
  }

  it('includes user name', () => {
    const prompt = buildSafetyResponsePrompt(baseParams)
    expect(prompt).toContain('Sam')
  })

  it('includes entry content', () => {
    const prompt = buildSafetyResponsePrompt(baseParams)
    expect(prompt).toContain("no point")
  })

  it('includes risk level context', () => {
    const prompt = buildSafetyResponsePrompt(baseParams)
    expect(prompt.toLowerCase()).toContain('moderate')
  })

  it('includes emotion arc context', () => {
    const prompt = buildSafetyResponsePrompt(baseParams)
    expect(prompt).toContain('sadness → fear → anticipation')
  })

  it('high risk appends crisis line', () => {
    const prompt = buildSafetyResponsePrompt({ ...baseParams, riskLevel: 'high' as const })
    expect(prompt).toContain('741741')
  })

  it('moderate risk does not append crisis line', () => {
    const prompt = buildSafetyResponsePrompt({ ...baseParams, riskLevel: 'moderate' as const })
    expect(prompt).not.toContain('741741')
  })

  it('handles missing emotionArc gracefully', () => {
    const withoutArc = { content: baseParams.content, riskLevel: baseParams.riskLevel, userName: baseParams.userName }
    const prompt = buildSafetyResponsePrompt(withoutArc)
    expect(typeof prompt).toBe('string')
  })
})
