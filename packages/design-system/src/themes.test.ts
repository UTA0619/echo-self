/**
 * Tests for the ECHO design system theme object and token aliases.
 *
 * Verifies completeness and consistency of design tokens — ensures no
 * typos in color hex values, spacing is on the 4pt grid, and the
 * composed theme object has all required sections.
 *
 * Run with: pnpm test (vitest from workspace root)
 */

import { describe, it, expect } from 'vitest'
import { theme, tokens } from './themes.js'
import { brand, base, spacing } from './index.js'

const HEX_PATTERN = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/

describe('theme', () => {
  it('has all required top-level sections', () => {
    expect(theme.colors).toBeDefined()
    expect(theme.spacing).toBeDefined()
    expect(theme.radius).toBeDefined()
    expect(theme.typography).toBeDefined()
    expect(theme.motion).toBeDefined()
  })

  it('colors.brand has accent and warm', () => {
    expect(theme.colors.brand.accent).toBe('#7B6CF6')
    expect(theme.colors.brand.warm).toBe('#F6A26C')
  })

  it('colors.base background is the correct dark value', () => {
    expect(theme.colors.base.background).toBe('#0A0B0F')
  })

  it('typography has fontFamily, fontWeight, typeScale', () => {
    expect(theme.typography.fontFamily).toBeDefined()
    expect(theme.typography.fontWeight).toBeDefined()
    expect(theme.typography.typeScale).toBeDefined()
  })

  it('motion has duration, easing, springs, stagger', () => {
    expect(theme.motion.duration).toBeDefined()
    expect(theme.motion.easing).toBeDefined()
    expect(theme.motion.springs).toBeDefined()
    expect(theme.motion.stagger).toBeDefined()
  })
})

describe('tokens', () => {
  it('has all required shorthand keys', () => {
    const requiredKeys = [
      'bg', 'bgAlt', 'border', 'borderFocus', 'borderError',
      'textPrimary', 'textSecondary', 'textMuted',
      'primary', 'primaryHover',
      'success', 'warning', 'error', 'info',
      'cardBg', 'cardBorder', 'inputBg', 'tabBar',
    ]
    requiredKeys.forEach(key => {
      expect(tokens).toHaveProperty(key)
    })
  })

  it('bg matches base.background', () => {
    expect(tokens.bg).toBe(base.background)
  })

  it('primary matches brand.accent', () => {
    expect(tokens.primary).toBe(brand.accent)
  })

  it('all hex color values are valid', () => {
    Object.entries(tokens).forEach(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('#')) {
        expect(value).toMatch(HEX_PATTERN, `${key}: ${value} is not a valid hex color`)
      }
    })
  })
})

describe('spacing scale (4pt grid)', () => {
  it('all spacing values are divisible by 2', () => {
    Object.entries(spacing).forEach(([key, value]) => {
      // Allow xxs=2 which is on 2pt grid (half step)
      if (key !== 'xxs') {
        expect(value % 4).toBe(0, `spacing.${key}=${value} is not on 4pt grid`)
      }
    })
  })

  it('spacing increases monotonically', () => {
    const values = Object.values(spacing) as number[]
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1])
    }
  })
})

describe('brand colors', () => {
  it('accent is correct indigo', () => {
    expect(brand.accent).toBe('#7B6CF6')
  })

  it('warm is correct orange', () => {
    expect(brand.warm).toBe('#F6A26C')
  })

  it('all brand colors are valid hex', () => {
    Object.entries(brand).forEach(([key, value]) => {
      expect(value).toMatch(HEX_PATTERN, `brand.${key} is not valid hex`)
    })
  })
})
