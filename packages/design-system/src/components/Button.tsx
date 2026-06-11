/**
 * Button — ECHO design system primitive.
 *
 * Variants:
 *   primary  — filled accent (default)
 *   secondary — muted surface with border
 *   ghost    — no background, hover only
 *   danger   — red destructive actions
 *
 * Sizes: sm | md (default) | lg
 */
import * as React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-echo-accent text-white hover:bg-echo-accent-dark active:bg-echo-accent-dark ' +
    'shadow-echo-glow disabled:opacity-50 disabled:shadow-none',
  secondary:
    'bg-echo-surface text-echo-text border border-echo-border hover:bg-echo-surface-2 ' +
    'disabled:opacity-50',
  ghost:
    'bg-transparent text-echo-text-secondary hover:bg-echo-surface hover:text-echo-text ' +
    'disabled:opacity-50',
  danger:
    'bg-echo-error text-white hover:brightness-110 active:brightness-90 disabled:opacity-50',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
}

function cx(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant  = 'primary',
      size     = 'md',
      loading  = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cx(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-echo-accent/50',
          'cursor-pointer disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin shrink-0"
            width={size === 'sm' ? 12 : size === 'lg' ? 18 : 14}
            height={size === 'sm' ? 12 : size === 'lg' ? 18 : 14}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
