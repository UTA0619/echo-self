/**
 * ECHO Design System — Spacing & Layout Tokens
 *
 * All values in pixels (or dp on mobile). Use these everywhere instead of
 * magic numbers so layout stays consistent across screens.
 */

// ── Base spacing scale (4-pt grid) ───────────────────────────────────────────

export const spacing = {
  /** 2px — hairline gap */
  xxs: 2,
  /** 4px */
  xs:  4,
  /** 8px */
  sm:  8,
  /** 12px */
  md:  12,
  /** 16px */
  lg:  16,
  /** 24px */
  xl:  24,
  /** 32px */
  xxl: 32,
  /** 48px */
  xxxl: 48,
  /** 64px */
  xxxxl: 64,
} as const

// ── Border radius ─────────────────────────────────────────────────────────────

export const radius = {
  /** 6px — small chips, tags */
  xs:   6,
  /** 10px — inputs, small cards */
  sm:   10,
  /** 14px — standard cards */
  md:   14,
  /** 18px — elevated cards */
  lg:   18,
  /** 24px — modal sheets */
  xl:   24,
  /** 32px — hero cards */
  xxl:  32,
  /** Full pill */
  full: 9999,
} as const

// ── Layout constants ──────────────────────────────────────────────────────────

export const layout = {
  /** Horizontal page padding */
  pagePadding:    24,

  /** Max content width for web */
  maxContentWidth: 640,

  /** Max dashboard width for web admin */
  maxDashWidth:   1152,

  /** Bottom safe-area extra pad for iOS home indicator */
  iosBottomPad:   34,

  /** Standard icon sizes */
  iconSm: 16,
  iconMd: 24,
  iconLg: 32,

  /** Touch target minimum (Apple HIG: 44pt) */
  touchTarget: 44,

  /** Tab bar height (mobile) */
  tabBarHeight: 60,

  /** Header height (mobile) */
  headerHeight: 56,
} as const

// ── Z-index scale ─────────────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  10,
  overlay: 100,
  modal:   200,
  toast:   300,
  tooltip: 400,
} as const

// ── Shadow presets (cross-platform descriptors) ───────────────────────────────
// For React Native: use shadowColor + shadowOffset + shadowOpacity + shadowRadius + elevation
// For web: convert to box-shadow CSS

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  accent: {
    shadowColor: '#7B6CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
} as const
