export const Colors = {
  // Base
  black: '#0A0A0F',
  white: '#FFFFFF',
  silver: '#A0A0B0',

  // Brand
  indigo: '#4F46E5',
  indigoLight: '#6366F1',
  violet: '#7C3AED',
  violetLight: '#8B5CF6',
  cyan: '#06B6D4',
  cyanLight: '#22D3EE',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Emotion palette
  joy: '#FBBF24',
  sadness: '#6366F1',
  anger: '#EF4444',
  fear: '#9CA3AF',
  surprise: '#06B6D4',
  disgust: '#10B981',
  anticipation: '#F59E0B',
  trust: '#EC4899',
  optimism: '#FCD34D',
  love: '#8B5CF6',
  awe: '#4F46E5',

  // Surface
  surface0: 'rgba(255,255,255,0.03)',
  surface1: 'rgba(255,255,255,0.06)',
  surface2: 'rgba(255,255,255,0.09)',
  surface3: 'rgba(255,255,255,0.12)',

  // Border
  border0: 'rgba(255,255,255,0.06)',
  border1: 'rgba(255,255,255,0.12)',
  border2: 'rgba(255,255,255,0.20)',

  // Text
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.60)',
  textTertiary: 'rgba(255,255,255,0.35)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Typography = {
  displayXl: {
    fontSize: 40,
    fontWeight: '800' as const,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  displayLg: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -1,
    lineHeight: 40,
  },
  displayMd: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  headingLg: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  headingMd: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  bodyLg: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 26,
  },
  bodyMd: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodySm: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
  },
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;
