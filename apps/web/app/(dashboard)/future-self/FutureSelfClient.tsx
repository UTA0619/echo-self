'use client'

import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Simulation {
  id:               string
  horizon_months:   1 | 3 | 12
  narrative:        string
  letter_text:      string | null
  trajectory_score: number | null
  created_at:       string
}

interface Props {
  simulations: Simulation[]
  isPremium:   boolean
}

const HORIZONS: Array<{ months: 1 | 3 | 12; label: string; icon: string }> = [
  { months: 1,  label: '1 Month',  icon: '🌱' },
  { months: 3,  label: '3 Months', icon: '🌿' },
  { months: 12, label: '1 Year',   icon: '🌳' },
]

// ── Score ring ────────────────────────────────────────────────────────────────

function TrajectoryRing({ score }: { score: number }) {
  const pct  = score / 100
  const r    = 40
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const color = pct >= 0.7 ? '#10B981' : pct >= 0.4 ? '#F6A26C' : '#EF4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Background track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1E2030" strokeWidth="8" />
        {/* Progress arc */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="50" y="54" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">
          {score}
        </text>
      </svg>
      <p className="text-[11px] text-[#8B8FA8]">Trajectory score</p>
    </div>
  )
}

// ── Regenerate button ─────────────────────────────────────────────────────────

function RegenerateButton({ isPremium }: { isPremium: boolean }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  if (!isPremium) {
    return (
      <a
        href="/settings"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#7B6CF6] text-[#7B6CF6] text-sm hover:bg-[#7B6CF6]/10 transition-colors"
      >
        🔒 Upgrade to regenerate
      </a>
    )
  }

  const handleRegenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/future-self', { method: 'POST' })
      if (res.ok) {
        setDone(true)
        // Reload to show fresh simulations
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (err) {
      console.error('Regenerate failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRegenerate}
      disabled={loading || done}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7B6CF6] text-white text-sm font-medium hover:bg-[#6A5CE5] transition-colors disabled:opacity-60"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : done ? (
        '✓ Regenerating…'
      ) : (
        '↻ Regenerate simulations'
      )}
    </button>
  )
}

// ── Simulation card ───────────────────────────────────────────────────────────

function SimulationCard({ sim }: { sim: Simulation }) {
  const [showLetter, setShowLetter] = useState(false)

  return (
    <div className="space-y-4">
      {/* Score + narrative */}
      <div className="flex gap-6 items-start">
        {sim.trajectory_score != null && (
          <TrajectoryRing score={sim.trajectory_score} />
        )}
        <div className="flex-1">
          <p className="text-sm text-[#C8CAD8] leading-relaxed">{sim.narrative}</p>
          <p className="text-[11px] text-[#8B8FA8] mt-2">
            Generated {new Date(sim.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Letter toggle */}
      {sim.letter_text && (
        <div>
          <button
            onClick={() => setShowLetter(v => !v)}
            className="text-xs text-[#7B6CF6] hover:text-[#9B8CF6] transition-colors"
          >
            {showLetter ? '▲ Hide letter' : '✉ Read letter from future you'}
          </button>

          {showLetter && (
            <div className="mt-3 p-4 bg-[#141620] border border-[#1E2030] rounded-xl">
              <p className="text-xs text-[#8B8FA8] mb-2 uppercase tracking-widest">
                A letter from your future self
              </p>
              <p className="text-sm text-[#C8CAD8] leading-relaxed whitespace-pre-wrap italic">
                {sim.letter_text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ isPremium }: { isPremium: boolean }) {
  return (
    <div className="text-center py-20">
      <p className="text-4xl mb-4">🔭</p>
      <p className="text-white font-medium mb-2">No simulations yet</p>
      {isPremium ? (
        <>
          <p className="text-[#8B8FA8] text-sm mb-6">
            Future self simulations are generated nightly once you have 20+ memories.
            Keep journaling to build your memory store!
          </p>
          <RegenerateButton isPremium={isPremium} />
        </>
      ) : (
        <>
          <p className="text-[#8B8FA8] text-sm mb-6">
            Upgrade to Pro to unlock future self simulations.
          </p>
          <a
            href="/settings"
            className="inline-block px-4 py-2 rounded-lg bg-[#7B6CF6] text-white text-sm font-medium"
          >
            Upgrade to Pro →
          </a>
        </>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function FutureSelfClient({ simulations, isPremium }: Props) {
  const [activeHorizon, setActiveHorizon] = useState<1 | 3 | 12>(
    simulations[0]?.horizon_months ?? 1,
  )

  const activeSim = simulations.find(s => s.horizon_months === activeHorizon)

  if (simulations.length === 0) {
    return <EmptyState isPremium={isPremium} />
  }

  return (
    <div className="space-y-6">
      {/* Horizon tabs */}
      <div className="flex gap-2 bg-[#141620] border border-[#1E2030] rounded-xl p-1">
        {HORIZONS.map(h => {
          const hasSim = simulations.some(s => s.horizon_months === h.months)
          return (
            <button
              key={h.months}
              onClick={() => setActiveHorizon(h.months)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg transition-colors ${
                activeHorizon === h.months
                  ? 'bg-[#7B6CF6] text-white font-medium'
                  : 'text-[#8B8FA8] hover:text-white'
              }`}
            >
              <span>{h.icon}</span>
              <span>{h.label}</span>
              {!hasSim && <span className="text-[10px] opacity-60">(soon)</span>}
            </button>
          )
        })}
      </div>

      {/* Active simulation */}
      {activeSim ? (
        <div className="bg-[#141620] border border-[#1E2030] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] text-[#7B6CF6] font-semibold uppercase tracking-widest">
              {HORIZONS.find(h => h.months === activeHorizon)?.label} projection
            </span>
          </div>
          <SimulationCard sim={activeSim} />
        </div>
      ) : (
        <div className="bg-[#141620] border border-[#1E2030] rounded-xl p-8 text-center">
          <p className="text-[#8B8FA8] text-sm">
            No simulation for this horizon yet. They&apos;re generated nightly.
          </p>
        </div>
      )}

      {/* Regenerate */}
      {isPremium && (
        <div className="flex justify-end">
          <RegenerateButton isPremium={isPremium} />
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-[#8B8FA8] leading-relaxed">
        Future self simulations are AI projections based on your journal entries and identity patterns.
        They reflect possible trajectories, not certainties. Use them as a mirror for reflection, not prediction.
      </p>
    </div>
  )
}
