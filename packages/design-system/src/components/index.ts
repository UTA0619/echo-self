/**
 * @echo-self/design-system — React component exports
 *
 * All components are framework-agnostic React (no Next.js / RN specifics).
 * They rely on echo-* Tailwind classes from echoTailwindPreset being
 * active in the consuming app.
 *
 * Usage:
 *   import { Button, Card, EmotionPill } from '@echo-self/design-system/components'
 *   // or from the root barrel:
 *   import { Button } from '@echo-self/design-system'
 */
export { Button }          from './Button.js'
export type { ButtonProps } from './Button.js'

export { Badge }           from './Badge.js'
export type { BadgeProps }  from './Badge.js'

export {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
}                           from './Card.js'
export type { CardProps }   from './Card.js'

export {
  EmotionPill,
  EmotionBar,
}                                 from './EmotionPill.js'
export type { EmotionPillProps, EmotionBarProps } from './EmotionPill.js'

export { Spinner, FullPageSpinner } from './Spinner.js'
export type { SpinnerProps }        from './Spinner.js'

export { Input, Label, FieldError } from './Input.js'
export type { InputProps }          from './Input.js'

export { Avatar }           from './Avatar.js'
export type { AvatarProps }  from './Avatar.js'
