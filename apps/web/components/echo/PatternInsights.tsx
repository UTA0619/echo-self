'use client'

import { useState } from 'react'

interface BehavioralPattern {
  id: string
  pattern_type: string
  pattern_description: string
  frequency_days: number
  confidence: number
  trigger_tags: string[]
  last_seen_at: string
}

interface PatternInsightsProps {
  patterns: BehavioralPattern[]
}

const TYPE_COLORS: Record<string, string> = {
  cognitive:   '#7B6CF6',
  emotional:   '#F6A26C',
  relational:  '#6CF6C8',
  energy:      '#F6D46C',
  temporal:    '#6C9EF6',
}

const TYPE_LABELS: Record<string, string> = {
  cognitive:  'Cognitive',
  emotional:  'Emotional',
  relational: 'Relational',
  energy:     'Energy',
  temporal:   'Temporal',
}

export function PatternInsights({ patterns }: PatternInsightsProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (patterns.length === 0) {
    return (
      <div className="rounded-xl bg-[#141620] border border-white/5 p-5 text-center space-y-2">
        <p className="text-sm text-[#8B8FA8]">Patterns emerge after a few weeks of journaling.</p>
        <p className="text-xs text-[#8B8FA8]/60">Keep writing — ECHO is watching for signals.</p>
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-medium text-[#8B8FA8] uppercase tracking-widest">
        Behavioral Patterns
      </h2>
      <div className="space-y-2">
        {patterns.map(p => {
          const color = TYPE_COLORS[p.pattern_type] ?? '#8B8FA8'
          const isOpen = expanded === p.id

          return (
            <div
              key={p.id}
              className="rounded-xl bg-[#141620] border border-white/5 overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : p.id)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span
                  className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ color, backgroundColor: `${color}18` }}
                    >
                      {TYPE_LABELS[p.pattern_type] ?? p.pattern_type}
                    </span>
                    <span className="text-[10px] text-[#8B8FA8]">
                      {Math.round(p.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-[#F0F0F5] leading-snug line-clamp-2">
                    {p.pattern_description}
                  </p>
                </div>
                <span className="text-[#8B8FA8] text-xs mt-0.5">{isOpen ? '↑' : '↓'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-[#8B8FA8] leading-relaxed">
                    {p.pattern_description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.trigger_tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8B8FA8]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {p.frequency_days && (
                    <p className="text-xs text-[#8B8FA8]">
                      Recurs approximately every {p.frequency_days} day{p.frequency_days !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
