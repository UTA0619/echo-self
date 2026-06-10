/**
 * Tests for the ECHO prompt registry.
 * Verifies that all registered prompts have valid metadata and
 * that the lookup helpers work correctly.
 *
 * Run with: pnpm test (via vitest from workspace root)
 */

import { describe, it, expect } from 'vitest'
import { PROMPT_REGISTRY, getPromptMeta, promptLogEntry } from './registry.js'

const VALID_MODELS = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
])

describe('PROMPT_REGISTRY', () => {
  it('has at least 5 entries', () => {
    expect(PROMPT_REGISTRY.length).toBeGreaterThanOrEqual(5)
  })

  it('all ids are unique', () => {
    const ids = PROMPT_REGISTRY.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all ids are kebab-case', () => {
    PROMPT_REGISTRY.forEach(m => {
      expect(m.id).toMatch(/^[a-z][a-z0-9-]*$/)
    })
  })

  it('all versions follow major.minor semver-lite', () => {
    PROMPT_REGISTRY.forEach(m => {
      expect(m.version).toMatch(/^\d+\.\d+$/)
    })
  })

  it('all models are approved Claude models', () => {
    PROMPT_REGISTRY.forEach(m => {
      expect(VALID_MODELS.has(m.model)).toBe(true)
    })
  })

  it('all updatedAt are ISO date strings', () => {
    PROMPT_REGISTRY.forEach(m => {
      expect(m.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  it('all changelogs are non-empty arrays', () => {
    PROMPT_REGISTRY.forEach(m => {
      expect(Array.isArray(m.changelog)).toBe(true)
      expect(m.changelog.length).toBeGreaterThan(0)
    })
  })

  it('changelog versions are in ascending order', () => {
    PROMPT_REGISTRY.forEach(m => {
      const versions = m.changelog.map(c => parseFloat(c.version))
      for (let i = 1; i < versions.length; i++) {
        // Loop bounds guarantee both indices exist; assert for noUncheckedIndexedAccess.
        expect(versions[i]!).toBeGreaterThan(versions[i - 1]!)
      }
    })
  })
})

describe('getPromptMeta', () => {
  it('returns metadata for a known id', () => {
    const meta = getPromptMeta('echo-response')
    expect(meta).toBeDefined()
    expect(meta?.id).toBe('echo-response')
  })

  it('returns undefined for unknown id', () => {
    expect(getPromptMeta('does-not-exist')).toBeUndefined()
  })

  it('finds all registered prompts by id', () => {
    PROMPT_REGISTRY.forEach(m => {
      expect(getPromptMeta(m.id)).toBeDefined()
    })
  })
})

describe('promptLogEntry', () => {
  it('returns structured log for known id', () => {
    const entry = promptLogEntry('echo-response')
    expect(entry.prompt_id).toBe('echo-response')
    expect(typeof entry.prompt_version).toBe('string')
    expect(typeof entry.prompt_model).toBe('string')
  })

  it('returns fallback for unknown id', () => {
    const entry = promptLogEntry('unknown-prompt')
    expect(entry.prompt_id).toBe('unknown-prompt')
    expect(entry.prompt_version).toBe('unknown')
  })

  it('all known ids produce valid log entries', () => {
    PROMPT_REGISTRY.forEach(m => {
      const entry = promptLogEntry(m.id)
      expect(entry.prompt_id).toBe(m.id)
      expect(entry.prompt_version).toBe(m.version)
      expect(VALID_MODELS.has(entry.prompt_model as string)).toBe(true)
    })
  })
})
