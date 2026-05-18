'use client'

import { useState } from 'react'

interface UpgradeModalProps {
  feature: string
  onClose: () => void
}

export function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error('Failed to start checkout')
      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-[#141620] border border-white/10 p-6 space-y-5">
        <div className="space-y-1">
          <p className="text-xs text-[#7B6CF6] font-medium uppercase tracking-widest">ECHO Pro</p>
          <h2 className="text-xl font-semibold text-[#F0F0F5]" style={{ fontFamily: 'var(--font-geist)' }}>
            Unlock {feature}
          </h2>
          <p className="text-sm text-[#8B8FA8]">
            Upgrade to access the full ECHO memory layer — unlimited entries, AI conversation, Future Self, and more.
          </p>
        </div>

        <ul className="space-y-2">
          {[
            'Unlimited journal entries',
            'Semantic memory search',
            'Future Self simulation',
            'Identity Web visualization',
            'Voice note transcription',
            'Weekly AI digest',
          ].map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-[#F0F0F5]">
              <span className="text-[#7B6CF6]">✓</span>
              {f}
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <button
            onClick={() => setPlan('monthly')}
            className={`flex-1 rounded-lg py-2.5 text-sm transition-colors ${
              plan === 'monthly'
                ? 'bg-[#7B6CF6] text-white'
                : 'bg-[#0A0B0F] text-[#8B8FA8] border border-white/10 hover:border-[#7B6CF6]/40'
            }`}
          >
            <div className="font-medium">$12/mo</div>
            <div className="text-xs opacity-75">Monthly</div>
          </button>
          <button
            onClick={() => setPlan('annual')}
            className={`flex-1 rounded-lg py-2.5 text-sm transition-colors ${
              plan === 'annual'
                ? 'bg-[#7B6CF6] text-white'
                : 'bg-[#0A0B0F] text-[#8B8FA8] border border-white/10 hover:border-[#7B6CF6]/40'
            }`}
          >
            <div className="font-medium">$99/yr</div>
            <div className="text-xs opacity-75">Save 31% ✦</div>
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full rounded-lg bg-[#7B6CF6] py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50 hover:opacity-90"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Redirecting to checkout…
            </span>
          ) : (
            `Upgrade to Pro →`
          )}
        </button>

        <button onClick={onClose} className="w-full text-xs text-[#8B8FA8] hover:text-[#F0F0F5]">
          Maybe later
        </button>
      </div>
    </div>
  )
}
