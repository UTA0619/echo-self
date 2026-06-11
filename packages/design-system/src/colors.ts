/**
 * ECHO Design System — Color Tokens
 *
 * Single source of truth for all colors used across mobile (React Native)
 * and web (Tailwind/CSS). These are raw hex values — no platform-specific
 * wrapping. Each consuming package applies them in its own way.
 *
 * Naming convention:
 *  - echo.*     : brand / semantic colors
 *  - surface.*  : elevated surface layers (opacity-based)
 *  - border.*   : stroke colors
 *  - text.*     : text foreground colors
 *  - emotion.*  : per-emotion accent colors
 */

// ── Brand palette ─────────────────────────────────────────────────────────────

export const brand = {
  /** Primary accent — indigo purple */
  accent:       '#7B6CF6',
  accentLight:  '#9B8DF8',
  accentDark:   '#5B4DD6',

  /** Warm secondary accent */
  warm:         '#F6A26C',
  warmLight:    '#F8B98A',
  warmDark:     '#E88A4A',

  /** Deep violet */
  violet:       '#7C3AED',
  violetLight:  '#8B5CF6',

  /** Cyan highlight */
  cyan:         '#06B6D4',
  cyanLight:    '#22D3EE',
} as const

// ── Base palette ──────────────────────────────────────────────────────────────

export const base = {
  black: '#0A0B0F',
  white: '#FFFFFF',

  /** Page / app background */
  background: '#0A0B0F',

  /** Card / panel surface */
  surface:    '#141620',

  /** Elevated surface (hover, active states) */
  surfaceHover: '#1C1F2E',

  /** Deep border lines */
  border:     '#1E2030',
  borderMid:  '#2A2D3E',
  borderHigh: '#3A3D50',
} as const

// ── Semantic ──────────────────────────────────────────────────────────────────

export const semantic = {
  success: '#22C55E',
  warning: '#EAB308',
  error:   '#EF4444',
  info:    '#3B82F6',
} as const

// ── Text scales ───────────────────────────────────────────────────────────────

export const text = {
  /** Near-white — headings, primary content */
  primary:   'rgba(255,255,255,0.95)',

  /** 70% white — body copy */
  secondary: 'rgba(255,255,255,0.70)',

  /** Muted — labels, timestamps */
  muted:     'rgba(255,255,255,0.45)',

  /** Very faint — placeholder, disabled */
  faint:     'rgba(255,255,255,0.25)',

  /** Accent-colored text */
  accent:    '#7B6CF6',
  warm:      '#F6A26C',
} as const

// ── Surface overlays (rgba) ───────────────────────────────────────────────────

export const surface = {
  /** 3% white lift — subtlest elevation */
  s0: 'rgba(255,255,255,0.03)',
  /** 6% */
  s1: 'rgba(255,255,255,0.06)',
  /** 10% */
  s2: 'rgba(255,255,255,0.10)',
  /** 15% */
  s3: 'rgba(255,255,255,0.15)',

  /** Accent tint backgrounds */
  accentTint:  'rgba(123,108,246,0.12)',
  accentGlow:  'rgba(123,108,246,0.20)',
  warmTint:    'rgba(246,162,108,0.12)',
  successTint: 'rgba(34,197,94,0.12)',
  errorTint:   'rgba(239,68,68,0.12)',
} as const

// ── Emotion colors ────────────────────────────────────────────────────────────
// Each emotion has a primary hex and a tinted overlay variant.

export const emotions = {
  joy:          { primary: '#FBBF24', tint: 'rgba(251,191,36,0.15)'  },
  sadness:      { primary: '#6366F1', tint: 'rgba(99,102,241,0.15)'  },
  anger:        { primary: '#EF4444', tint: 'rgba(239,68,68,0.15)'   },
  fear:         { primary: '#9CA3AF', tint: 'rgba(156,163,175,0.15)' },
  surprise:     { primary: '#06B6D4', tint: 'rgba(6,182,212,0.15)'   },
  disgust:      { primary: '#10B981', tint: 'rgba(16,185,129,0.15)'  },
  anticipation: { primary: '#F59E0B', tint: 'rgba(245,158,11,0.15)'  },
  trust:        { primary: '#EC4899', tint: 'rgba(236,72,153,0.15)'  },
  optimism:     { primary: '#FCD34D', tint: 'rgba(252,211,77,0.15)'  },
  love:         { primary: '#8B5CF6', tint: 'rgba(139,92,246,0.15)'  },
  awe:          { primary: '#7B6CF6', tint: 'rgba(123,108,246,0.15)' },
  mixed:        { primary: '#8B8FA8', tint: 'rgba(139,143,168,0.15)' },
} as const

export type EmotionKey = keyof typeof emotions

/** Returns the primary color for a given emotion, falling back to `mixed` */
export function emotionColor(emotion: string): string {
  return (emotions[emotion as EmotionKey] ?? emotions.mixed).primary
}

/**
 * Returns the tint overlay for a given emotion at the given opacity (0–1).
 * When opacity is omitted, returns the pre-baked 0.15 tint string.
 */
export function emotionTint(emotion: string, opacity?: number): string {
  const primary = emotionColor(emotion)
  if (opacity === undefined) {
    return (emotions[emotion as EmotionKey] ?? emotions.mixed).tint
  }
  return hexToRgba(primary, opacity)
}

/**
 * Converts a hex color (#RRGGBB or #RGB) to an rgba() CSS string.
 * Returns transparent as a safe fallback for malformed input.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean

  if (full.length !== 6) return `rgba(0,0,0,${alpha})`

  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Gradient presets ──────────────────────────────────────────────────────────

export const gradients = {
  /** Hero gradient — accent → violet */
  hero:   ['#7B6CF6', '#5B4DD6'] as const,

  /** Warm gradient — accent → warm orange */
  warm:   ['#7B6CF6', '#F6A26C'] as const,

  /** Dark card surface gradient */
  card:   ['#141620', '#0D0F1A'] as const,

  /** Danger / crisis gradient */
  danger: ['#EF4444', '#B91C1C'] as const,
} as const
