/**
 * ECHO Design System — Typography Tokens
 *
 * Font sizes, weights, line heights, and letter-spacing values.
 * Numeric values only — no CSS-specific strings — so they work
 * equally in React Native StyleSheet and Tailwind/CSS.
 *
 * Web app adds Geist (display), Inter (body), Geist Mono (code) via
 * CSS font-face. Mobile uses system fonts that approximate these.
 */

// ── Font family keys (resolved per-platform) ──────────────────────────────────

export const fontFamily = {
  /** Display headings — Geist on web, SF Pro Display on iOS */
  display: 'System',
  /** Body text — Inter on web, SF Pro Text on iOS */
  body:    'System',
  /** Monospace — Geist Mono on web, Menlo on iOS */
  mono:    'monospace',
} as const

// ── Font weights ──────────────────────────────────────────────────────────────

export const fontWeight = {
  regular:   '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
  extrabold: '800',
  black:     '900',
} as const

// ── Type scale ────────────────────────────────────────────────────────────────
// Each step carries fontSize, lineHeight, letterSpacing, and fontWeight.
// All sizes in px/pt.

export const typeScale = {
  /** Hero titles — 48px */
  displayXl: {
    fontSize:      48,
    lineHeight:    56,
    letterSpacing: -2,
    fontWeight:    fontWeight.extrabold,
  },
  /** Page headings — 36px */
  displayLg: {
    fontSize:      36,
    lineHeight:    44,
    letterSpacing: -1.5,
    fontWeight:    fontWeight.bold,
  },
  /** Section headings — 28px */
  displayMd: {
    fontSize:      28,
    lineHeight:    36,
    letterSpacing: -1,
    fontWeight:    fontWeight.bold,
  },
  /** Card headings — 22px */
  displaySm: {
    fontSize:      22,
    lineHeight:    30,
    letterSpacing: -0.5,
    fontWeight:    fontWeight.bold,
  },
  /** Sub-headings — 18px */
  headingLg: {
    fontSize:      18,
    lineHeight:    26,
    letterSpacing: -0.3,
    fontWeight:    fontWeight.semibold,
  },
  /** Labels / item headings — 15px */
  headingMd: {
    fontSize:      15,
    lineHeight:    22,
    letterSpacing: -0.1,
    fontWeight:    fontWeight.semibold,
  },
  /** Large body — 17px */
  bodyLg: {
    fontSize:      17,
    lineHeight:    27,
    letterSpacing: 0,
    fontWeight:    fontWeight.regular,
  },
  /** Standard body — 15px */
  bodyMd: {
    fontSize:      15,
    lineHeight:    24,
    letterSpacing: 0,
    fontWeight:    fontWeight.regular,
  },
  /** Small body — 13px */
  bodySm: {
    fontSize:      13,
    lineHeight:    20,
    letterSpacing: 0,
    fontWeight:    fontWeight.regular,
  },
  /** Micro labels — 11px */
  caption: {
    fontSize:      11,
    lineHeight:    16,
    letterSpacing: 0.4,
    fontWeight:    fontWeight.medium,
  },
  /** Uppercase all-caps labels — 10px */
  label: {
    fontSize:      10,
    lineHeight:    14,
    letterSpacing: 1,
    fontWeight:    fontWeight.semibold,
  },
} as const

export type TypeScaleKey = keyof typeof typeScale
