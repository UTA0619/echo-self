/**
 * Input — ECHO design system text input.
 *
 * Sizes: sm | md (default) | lg
 * States: default, focused (ring), error, disabled
 *
 * Compose with <Label> and <FieldError> for accessible form fields.
 */
import * as React from 'react'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?:     'sm' | 'md' | 'lg'
  error?:    boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-3.5 py-2 text-sm rounded-xl',
  lg: 'px-4 py-2.5 text-base rounded-xl',
}

function cx(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size     = 'md',
      error    = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-echo-text-muted pointer-events-none" aria-hidden>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={cx(
              'w-full bg-echo-surface border transition-colors duration-150',
              'text-echo-text placeholder:text-echo-text-muted',
              'focus:outline-none focus:ring-2',
              error
                ? 'border-echo-error focus:ring-echo-error/30'
                : 'border-echo-border focus:border-echo-accent focus:ring-echo-accent/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              SIZE_CLASSES[size],
              leftIcon  ? (size === 'sm' ? 'pl-7' : size === 'lg' ? 'pl-11' : 'pl-9') : '',
              rightIcon ? (size === 'sm' ? 'pr-7' : size === 'lg' ? 'pr-11' : 'pr-9') : '',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-echo-text-muted pointer-events-none" aria-hidden>
              {rightIcon}
            </span>
          )}
        </div>
      )
    }

    return (
      <input
        ref={ref}
        disabled={disabled}
        className={cx(
          'w-full bg-echo-surface border transition-colors duration-150',
          'text-echo-text placeholder:text-echo-text-muted',
          'focus:outline-none focus:ring-2',
          error
            ? 'border-echo-error focus:ring-echo-error/30'
            : 'border-echo-border focus:border-echo-accent focus:ring-echo-accent/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'

/** Label for form fields — associates with the input via htmlFor. */
export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cx('block text-xs font-medium text-echo-text-secondary mb-1', className)}
      {...props}
    >
      {children}
    </label>
  )
}

/** Accessible error message below a form field. */
export function FieldError({
  id,
  className,
  children,
}: {
  id?: string
  className?: string
  children: React.ReactNode
}) {
  if (!children) return null
  return (
    <p
      id={id}
      role="alert"
      className={cx('mt-1 text-xs text-echo-error', className)}
    >
      {children}
    </p>
  )
}
