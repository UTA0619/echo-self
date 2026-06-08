/**
 * @echo-self/design-system
 *
 * Shared design tokens for the ECHO monorepo.
 * Import what you need — tree-shaking removes the rest.
 *
 * Usage:
 *   import { brand, emotions, typeScale, spacing } from '@echo-self/design-system'
 */

// Colors
export {
  brand,
  base,
  semantic,
  text,
  surface,
  emotions,
  gradients,
  emotionColor,
  emotionTint,
} from './colors.js'
export type { EmotionKey } from './colors.js'

// Spacing & layout
export { spacing, radius, layout, zIndex, shadows } from './spacing.js'

// Typography
export { fontFamily, fontWeight, typeScale } from './typography.js'
export type { TypeScaleKey } from './typography.js'

// Animation & motion
export {
  duration,
  easing,
  springs,
  stagger,
  motionVariants,
  cssAnimations,
} from './animation.js'

// Composed theme object + semantic token aliases
export { theme, tokens } from './themes.js'
export type { Theme, Tokens } from './themes.js'

// Tailwind preset
export { echoTailwindPreset } from './tailwind-preset.js'
