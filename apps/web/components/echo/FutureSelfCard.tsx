'use client'

import { useState } from 'react'

type Timeframe = '30d' | '90d' | '1yr'

interface Simulation {
  personaName?: string
  persona_name?: string
  description?: string
  keyTraitShifts?: string[]
  key_trait_shifts?: string[]
  confidenceScore?: number
  confidence_score?: number
  letter?: string
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '30d': '30 days',
  '90d': '90 days',
  '1yr': '1 year',
}

export function FutureSelfCard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('90d')
  const [simulation, setSimulation] = useState<Simulation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLetter, setShowLetter] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    setSimulation(null)
    setShowLetter(false)

    try {
      const res = await fetch('/api/future-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const json = await res.json() as { simulation: Simulation }
      setSimulation(json.simulation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const personaName = simulation?.personaName ?? simulation?.persona_name
  const description = simulation?.description
  const shifts = simulation?.keyTraitShifts ?? simulation?.key_trait_shifts ?? []
  const confidence = simulation?.confidenceScore ?? simulation?.confidence_score ?? 0
  const letter = simulation?.letter

  return (
    <div className="rounded-xl bg-[#141620] border border-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-[#8B8FA8] uppercase tracking-widest">Future Self</h2>
        {simulation && (
          <span className="text-xs text-[#8B8FA8]">{Math.round(confidence * 100)}% confidence</span>
        )}
      </div>

      {!simulation && (
        <>
          <p className="text-sm text-[#8B8FA8]">
            ECHO will simulate who you are becoming based on your memories, emotional patterns, and identity signals.
          </p>

          <div className="flex gap-2">
            {(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                  timeframe === t
                    ? 'bg-[#7B6CF6] text-white'
                    : 'bg-[#0A0B0F] text-[#8B8FA8] hover:text-[#F0F0F5] border border-white/5'
                }`}
              >
                {TIMEFRAME_LABELS[t]}
              </button>
            ))}
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="w-full rounded-lg bg-[#7B6CF6]/10 border border-[#7B6CF6]/30 py-3 text-sm text-[#7B6CF6] font-medium transition-all hover:bg-[#7B6CF6]/20 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-[#7B6CF6] border-t-transparent rounded-full animate-spin" />
                Simulating your future…
              </span>
            ) : (
              `Meet your ${TIMEFRAME_LABELS[timeframe]} self →`
            )}
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </>
      )}

      {simulation && (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-[#7B6CF6] font-medium">{TIMEFRAME_LABELS[timeframe]} from now</p>
            <h3 className="text-lg font-semibold text-[#F0F0F5]" style={{ fontFamily: 'var(--font-geist)' }}>
              {personaName}
            </h3>
          </div>

          <p className="text-sm text-[#F0F0F5] leading-relaxed">{description}</p>

          {shifts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[#8B8FA8] font-medium">Key shifts ahead</p>
              <ul className="space-y-1.5">
                {shifts.map((shift, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#F0F0F5]">
                    <span className="text-[#7B6CF6] mt-0.5 shrink-0">→</span>
                    {shift}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {letter && (
            <div className="space-y-2">
              <button
                onClick={() => setShowLetter(v => !v)}
                className="text-xs text-[#7B6CF6] hover:underline"
              >
                {showLetter ? 'Hide letter' : 'Read letter from your future self →'}
              </button>
              {showLetter && (
                <div className="rounded-lg bg-[#0A0B0F] border border-white/5 p-4">
                  <p className="text-sm text-[#F0F0F5] leading-relaxed whitespace-pre-wrap font-serif">
                    {letter}
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setSimulation(null)}
            className="text-xs text-[#8B8FA8] hover:text-[#F0F0F5]"
          >
            Simulate again
          </button>
        </div>
      )}
    </div>
  )
}
