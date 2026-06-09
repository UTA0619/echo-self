/**
 * Card — surface container with optional glow and hover lift.
 *
 * Variants:
 *   default — standard echo-surface border card
 *   raised  — slightly elevated with echo-card shadow
 *   glow    — accent glow on hover (used for feature highlights)
 *   flat    — no border or shadow, just background
 */
import * as React from 'react'

type CardVariant = 'default' | 'raised' | 'glow' | 'flat'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:  CardVariant
  padding?:  'none' | 'sm' | 'md' | 'lg'
  as?:       React.ElementType
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:
    'bg-echo-surface border border-echo-border rounded-2xl',
  raised:
    'bg-echo-surface border border-echo-border rounded-2xl shadow-echo-card ' +
    'hover:shadow-echo-float hover:-translate-y-0.5 transition-[transform,shadow] duration-200',
  glow:
    'bg-echo-surface border border-echo-border rounded-2xl ' +
    'hover:border-echo-accent/40 hover:shadow-echo-glow transition-[border-color,box-shadow] duration-200',
  flat:
    'bg-echo-surface rounded-2xl',
}

const PADDING_CLASSES = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
}

function cx(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      as: Tag  = 'div',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Tag
        ref={ref}
        className={cx(
          VARIANT_CLASSES[variant],
          PADDING_CLASSES[padding],
          className,
        )}
        {...props}
      >
        {children}
      </Tag>
    )
  },
)

Card.displayName = 'Card'

// ── Compound sub-components ───────────────────────────────────────────────────

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('flex items-start justify-between gap-3 mb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cx('text-base font-semibold text-echo-text leading-tight', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('text-sm text-echo-text-secondary', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'flex items-center gap-3 mt-4 pt-4 border-t border-echo-border-faint',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
