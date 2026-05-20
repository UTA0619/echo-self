'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <main className="min-h-screen bg-[#0A0B0F] flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6 text-center">
        <p className="text-4xl">⚠️</p>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-[#F0F0F5]">Something went wrong</h1>
          <p className="text-sm text-[#8B8FA8]">
            ECHO hit an unexpected error. Your data is safe.
          </p>
          {error.digest && (
            <p className="text-[10px] text-[#8B8FA8] font-mono">ref: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-[#7B6CF6] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  )
}
