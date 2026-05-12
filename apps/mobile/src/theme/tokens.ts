export const Colors = {
  // Brand
  indigo: '#4F46E5',
  violet: '#7B5EA7',
  cyan: '#06B6D4',

  // Neutrals
  black: '#0A0A0F',
  blackSoft: '#12121A',
  surface: '#1A1A28',
  surfaceElevated: '#22223A',
  border: '#2D2D4A',
  silverDim: '#6B6B8A',
  silver: '#C8C8D4',
  white: '#FFFFFF',

  // Emotions
  joy: '#FBBF24',
  sadness: '#6366F1',
  anger: '#EF4444',
  fear: '#8B5CF6',
  surprise: '#F97316',
  disgust: '#10B981',
  anticipation: '#06B6D4',
  trust: '#34D399',
  optimism: '#F59E0B',
  love: '#EC4899',
  awe: '#8B5CF6',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
} as const

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  screen: 96,
} as const

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  xxl: 36,
  display: 48,
  hero: 64,
} as const

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
}

export const AnimationDuration = {
  instant: 0,
  quick: 150,
  standard: 300,
  cinematic: 600,
  dramatic: 1000,
} as const

export type EmotionColor = keyof typeof Colors
