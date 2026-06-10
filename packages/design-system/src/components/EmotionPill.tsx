/**
 * EmotionPill — colored pill displaying an ECHO emotion label.
 *
 * Renders with the per-emotion brand color from the design token palette.
 * Size variants match inline (xs), card (sm), and page-level (md) use cases.
 */
import * as React from 'react'
import { emotionColor, emotionTint, type EmotionKey } from '../colors.js'

const EMOTION_EMOJI: Record<EmotionKey, string> = {
  joy:          '☀️',
  sadness:      '🌧',
  anger:        '🔥',
  fear:         '🌑',
  surprise:     '✨',
  disgust:      '🍂',
  anticipation: '🌅',
  trust:        '🌿',
  optimism:     '🌤',
  love:         '💜',
  awe:          '🌌',
  mixed:        '🎭',
}

export interface EmotionPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  emotion:    EmotionKey
  size?:      'xs' | 'sm' | 'md'
  showEmoji?: boolean
  showDot?:   boolean
}

const SIZE_CLASSES = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1 rounded-full',
  sm: 'px-2 py-0.5 text-xs gap-1 rounded-full',
  md: 'px-3 py-1 text-sm gap-1.5 rounded-full',
}

function cx(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function EmotionPill({
  emotion,
  size       = 'sm',
  showEmoji  = false,
  showDot    = true,
  className,
  style,
  ...props
}: EmotionPillProps) {
  const color = emotionColor(emotion)
  const tint  = emotionTint(emotion, 0.15)
  const border = emotionTint(emotion, 0.3)

  return (
    <span
      className={cx(
        'inline-flex items-center border font-medium capitalize',
        SIZE_CLASSES[size],
        className,
      )}
      style={{
        backgroundColor: tint,
        color,
        borderColor:     border,
        ...style,
      }}
      {...props}
    >
      {showDot && (
        <span
          className={cx(
            'rounded-full shrink-0',
            size === 'xs' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5',
          )}
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      {showEmoji && (
        <span className="leading-none" aria-hidden="true">
          {EMOTION_EMOJI[emotion]}
        </span>
      )}
      {emotion}
    </span>
  )
}

EmotionPill.displayName = 'EmotionPill'

/**
 * EmotionBar — horizontal percentage bar with emotion color fill.
 * Used in Timeline / insight screens to show emotion distribution.
 */
export interface EmotionBarProps {
  emotion:  EmotionKey
  /** 0–1 fill percentage */
  pct:      number
  count?:   number
  className?: string
}

export function EmotionBar({ emotion, pct, count, className }: EmotionBarProps) {
  const color = emotionColor(emotion)
  const tint  = emotionTint(emotion, 0.12)

  return (
    <div
      className={cx('flex items-center gap-2 text-xs', className)}
      role="meter"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${emotion}: ${Math.round(pct * 100)}%`}
    >
      {/* Dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {/* Label */}
      <span className="w-24 text-echo-text-secondary capitalize shrink-0">{emotion}</span>
      {/* Track */}
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: tint }}
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: color }}
        />
      </div>
      {/* Count */}
      {count !== undefined && (
        <span className="text-echo-text-muted w-5 text-right shrink-0">{count}</span>
      )}
    </div>
  )
}

EmotionBar.displayName = 'EmotionBar'
