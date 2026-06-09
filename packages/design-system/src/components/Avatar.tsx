/**
 * Avatar — circular user avatar with fallback initials.
 *
 * Shows an image if src is provided; falls back to initials derived from
 * the name prop, rendered on an echo-accent background.
 *
 * Sizes: xs (24) | sm (32) | md (40, default) | lg (56) | xl (80)
 */
import * as React from 'react'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?:  string
  name?: string
  size?: AvatarSize
  alt?:  string
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
}

const SIZE_PX: Record<AvatarSize, number> = {
  xs: 24, sm: 32, md: 40, lg: 56, xl: 80,
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/).slice(0, 2)
  return words.map(w => w[0]?.toUpperCase() ?? '').join('')
}

function cx(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function Avatar({
  src,
  name,
  size     = 'md',
  alt,
  className,
  ...props
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const showImage = src && !imgError
  const initials  = getInitials(name)
  const px        = SIZE_PX[size]

  return (
    <span
      className={cx(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden',
        'bg-echo-accent/20 text-echo-accent font-semibold shrink-0',
        'select-none',
        SIZE_CLASSES[size],
        className,
      )}
      aria-label={alt ?? name ?? 'Avatar'}
      role={alt ? 'img' : undefined}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name ?? ''}
          width={px}
          height={px}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  )
}

Avatar.displayName = 'Avatar'
