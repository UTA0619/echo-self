'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Slot-in fallback. Receives error + reset fn. Defaults to a minimal card. */
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode
  /** Optional label for logging (e.g. 'IdentityWeb') */
  context?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.context ?? 'unknown'}]`, error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset })
      }
      return (
        <DefaultFallback
          error={this.state.error}
          reset={this.reset}
          context={this.props.context}
        />
      )
    }
    return this.props.children
  }
}

function DefaultFallback({
  error,
  reset,
  context,
}: {
  error: Error
  reset: () => void
  context?: string
}) {
  return (
    <div className="rounded-xl bg-[#141620] border border-red-500/20 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-red-400 text-lg leading-none">⚠</span>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-[#F0F0F5]">
            {context ? `${context} failed to load` : 'Something went wrong'}
          </p>
          <p className="text-xs text-[#8B8FA8] leading-relaxed">
            {error.message || 'An unexpected error occurred.'}
          </p>
        </div>
      </div>
      <button
        onClick={reset}
        className="text-xs text-[#7B6CF6] hover:text-[#A89DF8] transition-colors"
      >
        Try again →
      </button>
    </div>
  )
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

/** Wraps a single section (identity web, emotion timeline, etc.) */
export function SectionErrorBoundary({
  context,
  children,
}: {
  context: string
  children: ReactNode
}) {
  return <ErrorBoundary context={context}>{children}</ErrorBoundary>
}
