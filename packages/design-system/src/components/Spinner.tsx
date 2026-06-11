/**
 * Spinner — accessible loading indicator.
 *
 * Uses the echo-accent color by default; override via className.
 * Sizes: xs (12px) | sm (16px) | md (24px, default) | lg (36px)
 */
import * as React from 'react'

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?:  SpinnerSize
  label?: string
}

const SIZE_PX: Record<SpinnerSize, number> = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 36,
}

export function Spinner({ size = 'md', label = 'Loading…', className, ...props }: SpinnerProps) {
  const px = SIZE_PX[size]

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-label={label}
      role="status"
      className={`animate-spin text-echo-accent ${className ?? ''}`}
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

Spinner.displayName = 'Spinner'

/**
 * FullPageSpinner — centered spinner for route-level loading states.
 */
export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center min-h-[40vh] w-full"
      role="status"
    >
      <Spinner size="lg" label={label} />
    </div>
  )
}
