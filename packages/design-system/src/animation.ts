/**
 * ECHO Design System — Animation & Motion Tokens
 *
 * Timing, easing, and spring presets used across mobile (Reanimated)
 * and web (Framer Motion / CSS transitions).
 *
 * Keep these consistent to ensure the app feels cohesive.
 */

// ── Duration (ms) ─────────────────────────────────────────────────────────────

export const duration = {
  /** Instant feedback — button press, toggle */
  instant:  80,
  /** Fast — micro-interactions, tooltips */
  fast:     150,
  /** Standard — most transitions */
  normal:   250,
  /** Slower — page entrances, reveals */
  slow:     400,
  /** Very slow — hero animations, memory reveals */
  xslow:    600,
  /** Ambient — pulse rings, breathing effects */
  ambient:  2000,
} as const

// ── Easing curves ─────────────────────────────────────────────────────────────
// CSS cubic-bezier strings for web (Framer Motion / CSS).
// For React Native Reanimated: use Easing.bezier(...) equivalent.

export const easing = {
  /** Standard — most UI transitions */
  standard:    'cubic-bezier(0.4, 0.0, 0.2, 1)',
  /** Decelerate — elements entering the screen */
  decelerate:  'cubic-bezier(0.0, 0.0, 0.2, 1)',
  /** Accelerate — elements leaving the screen */
  accelerate:  'cubic-bezier(0.4, 0.0, 1, 1)',
  /** Sharp — quick state changes */
  sharp:       'cubic-bezier(0.4, 0.0, 0.6, 1)',
  /** Spring-like overshoot feel */
  spring:      'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

// ── Spring configs (Reanimated / Framer Motion) ───────────────────────────────

export const springs = {
  /** Gentle — large panels, modals */
  gentle: {
    damping: 18,
    stiffness: 120,
    mass: 1,
  },
  /** Bouncy — buttons, cards that pop */
  bouncy: {
    damping: 12,
    stiffness: 200,
    mass: 0.8,
  },
  /** Snappy — toggles, quick feedback */
  snappy: {
    damping: 20,
    stiffness: 300,
    mass: 0.7,
  },
  /** Stiff — position corrections, no overshoot */
  stiff: {
    damping: 28,
    stiffness: 400,
    mass: 1,
  },
} as const

// ── Stagger delays (for list entrance animations) ─────────────────────────────

export const stagger = {
  /** Items appear 40ms apart */
  fast:   40,
  /** Standard 80ms stagger */
  normal: 80,
  /** Slow 120ms stagger for dramatic reveals */
  slow:   120,
} as const

// ── Framer Motion variants (web) ──────────────────────────────────────────────

export const motionVariants = {
  /** Fade in from slightly below */
  fadeUp: {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  },
  /** Fade in from slightly above */
  fadeDown: {
    hidden:  { opacity: 0, y: -16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  },
  /** Scale pop */
  scalePop: {
    hidden:  { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] } },
  },
  /** Container with staggered children */
  staggerContainer: {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.08 } },
  },
  /** Ambient pulse ring (memory reveals) */
  pulseRing: {
    animate: {
      scale:   [1, 1.12, 1],
      opacity: [0.6, 0.2, 0.6],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
  },
} as const

// ── CSS keyframe names (used in Tailwind / global CSS) ───────────────────────
// Reference these in tailwind.config `animation` / `keyframes` entries.

export const cssAnimations = {
  /** Subtle breathing pulse for ambient background */
  ambientPulse: 'echo-ambient-pulse 4s ease-in-out infinite',
  /** Memory card reveal shimmer */
  shimmer:      'echo-shimmer 1.5s linear infinite',
  /** Notification bounce */
  bounce:       'echo-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const
