// ECHO//SELF — Design Tokens

export const Colors = {
  // Base
  black:    '#0A0A0F',
  white:    '#FFFFFF',
  silver:   '#A0A0B0',

  // Brand
  indigo:   '#4F46E5',
  violet:   '#7C3AED',
  cyan:     '#06B6D4',
  teal:     '#14B8A6',
  amber:    '#F59E0B',
  rose:     '#F43F5E',
  emerald:  '#10B981',

  // UI surfaces
  surface:  '#13131A',
  card:     '#1A1A26',
  border:   'rgba(255,255,255,0.08)',
  overlay:  'rgba(0,0,0,0.6)',

  // Text
  textPrimary:   '#F0F0FF',
  textSecondary: '#8080A0',
  textMuted:     '#404060',
} as const

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl: 64,
} as const

export const Typography = {
  displayXl: { fontSize: 48, fontWeight: '800' as const, letterSpacing: -2 },
  displayLg: { fontSize: 36, fontWeight: '700' as const, letterSpacing: -1 },
  displayMd: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  headingLg: { fontSize: 22, fontWeight: '600' as const },
  headingMd: { fontSize: 18, fontWeight: '600' as const },
  bodySm:    { fontSize: 14, fontWeight: '400' as const },
  bodyMd:    { fontSize: 16, fontWeight: '400' as const },
  caption:   { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.4 },
} as const

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const
