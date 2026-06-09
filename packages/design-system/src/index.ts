/**
 * @echo-self/design-system
 *
 * Shared design tokens + React UI components for the ECHO monorepo.
 * Import what you need — tree-shaking removes the rest.
 *
 * Usage (tokens):
 *   import { brand, emotions, typeScale, spacing } from '@echo-self/design-system'
 *
 * Usage (components — requires React ≥ 18 and echoTailwindPreset active):
 *   import { Button, Card, EmotionPill } from '@echo-self/design-system'
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
  hexToRgba,
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

// React UI components (web — require React peer dep + echoTailwindPreset)
export {
  Button,
  Badge,
  Card, CardHeader, CardTitle, CardBody, CardFooter,
  EmotionPill, EmotionBar,
  Spinner, FullPageSpinner,
  Input, Label, FieldError,
  Avatar,
} from './components/index.js'
export type {
  ButtonProps,
  BadgeProps,
  CardProps,
  EmotionPillProps,
  EmotionBarProps,
  SpinnerProps,
  InputProps,
  AvatarProps,
} from './components/index.js'
