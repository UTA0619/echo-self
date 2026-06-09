/**
 * Badge — compact label chip.
 *
 * Variants:
 *   default   — muted surface
 *   accent    — indigo brand
 *   success   — green
 *   warning   — amber
 *   error     — red
 *   emotion   — per-emotion color (pass emotionKey prop)
 */
import * as React from 'react'
import { emotionColor, emotionTint, type EmotionKey } from '../colors.js'

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'emotion'
type BadgeSize    = 'xs' | 'sm' | 'md'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:    BadgeVariant
  size?:       BadgeSize
  dot?:        boolean
  emotionKey?: EmotionKey
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-echo-surface-2 text-echo-text-secondary border-echo-border-faint',
  accent:  'bg-echo-accent/15 text-echo-accent border-echo-accent/25',
  success: 'bg-echo-success/15 text-echo-success border-echo-success/25',
  warning: 'bg-echo-warning/15 text-echo-warning border-echo-warning/25',
  error:   'bg-echo-error/15 text-echo-error border-echo-error/25',
  // emotion variant applies inline style for dynamic colors
  emotion: '',
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1',
  sm: 'px-2 py-0.5 text-xs gap-1.5',
  md: 'px-2.5 py-1 text-sm gap-1.5',
}

function cx(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function Badge({
  variant    = 'default',
  size       = 'sm',
  dot        = false,
  emotionKey,
  className,
  style,
  children,
  ...props
}: BadgeProps) {
  const isEmotion = variant === 'emotion' && emotionKey

  const emotionStyle: React.CSSProperties | undefined = isEmotion
    ? {
        backgroundColor: emotionTint(emotionKey!, 0.15),
        color:           emotionColor(emotionKey!),
        borderColor:     emotionTint(emotionKey!, 0.3),
        ...style,
      }
    : style

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border font-medium',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      style={emotionStyle}
      {...props}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={isEmotion ? { backgroundColor: emotionColor(emotionKey!) } : undefined}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

Badge.displayName = 'Badge'
