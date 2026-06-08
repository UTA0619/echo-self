/**
 * ECHO Design System — Theme object
 *
 * A single composed theme that aggregates all design tokens into
 * a typed object. Both mobile (React Native) and web can consume
 * this — mobile uses raw values, web maps these to Tailwind classes.
 *
 * Usage:
 *   import { theme } from '@echo-self/design-system'
 *   style={{ backgroundColor: theme.colors.surface.s1 }}
 */

import { brand, base, semantic, text, surface, emotions, gradients } from './colors.js'
import { spacing, radius, layout, zIndex, shadows } from './spacing.js'
import { fontFamily, fontWeight, typeScale } from './typography.js'
import { duration, easing, springs, stagger } from './animation.js'

export const theme = {
  colors: {
    /** Primary brand palette */
    brand,
    /** Background / structural colors */
    base,
    /** Status / semantic colors */
    semantic,
    /** Text hierarchy */
    text,
    /** Surface layers */
    surface,
    /** Emotion-specific palette */
    emotions,
    /** Gradient definitions */
    gradients,
  },

  spacing,
  radius,
  layout,
  zIndex,
  shadows,

  typography: {
    fontFamily,
    fontWeight,
    typeScale,
  },

  motion: {
    duration,
    easing,
    springs,
    stagger,
  },
} as const

export type Theme = typeof theme

/**
 * Semantic color aliases — shorthand for the most common colors used in components.
 * Maps intent → raw color values.
 */
export const tokens = {
  // Backgrounds
  bg:       base.background,
  bgAlt:    base.surface,
  bgRaised: '#191B28',

  // Borders
  border:      base.border,
  borderFocus: brand.accent,
  borderError: semantic.error,

  // Text
  textPrimary:   text.primary,
  textSecondary: text.secondary,
  textMuted:     text.muted,
  textFaint:     text.faint,

  // Interactive
  primary:        brand.accent,
  primaryHover:   brand.violet,
  primaryPressed: '#6058D8',

  warmAccent:  brand.warm,

  // Status
  success: semantic.success,
  warning: semantic.warning,
  error:   semantic.error,
  info:    semantic.info,

  // Component-level shortcuts
  cardBg:     base.surface,
  cardBorder: base.border,
  inputBg:    base.background,
  tabBar:     base.surface,
} as const

export type Tokens = typeof tokens
