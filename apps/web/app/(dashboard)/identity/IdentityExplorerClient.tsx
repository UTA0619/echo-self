'use client'

import { useState, useMemo } from 'react'
import type { IdentityNode, BehavioralPattern } from '@/lib/identity'

// ── Type meta ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  belief:               { label: 'Beliefs',             icon: '💡', color: '#7B6CF6' },
  value:                { label: 'Values',              icon: '⭐', color: '#F6A26C' },
  core_fear:            { label: 'Core Fears',          icon: '🌑', color: '#EF4444' },
  core_desire:          { label: 'Core Desires',        icon: '🌟', color: '#10B981' },
  behavioral_pattern:   { label: 'Behavioral Patterns', icon: '🔄', color: '#06B6D4' },
  relationship_pattern: { label: 'Relationship Patterns',icon: '🌐', color: '#8B5CF6' },
  strength:             { label: 'Strengths',           icon: '💪', color: '#FBBF24' },
}

const POLARITY_COLOR = {
  positive: '#10B981',
  negative: '#EF4444',
  neutral:  '#8B8FA8',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct  = Math.round(value * 100)
  const color = value >= 0.7 ? '#10B981' : value >= 0.4 ? '#F6A26C' : '#8B8FA8'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-[#1E2030] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-[#8B8FA8] tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}

function NodeCard({ node }: { node: IdentityNode }) {
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[node.type]

  return (
    <div
      className="bg-[#141620] border border-[#1E2030] rounded-xl p-4 cursor-pointer hover:border-[#2A2D40] transition-colors"
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${meta?.color ?? '#7B6CF6'}20`,
                color: meta?.color ?? '#7B6CF6',
              }}
            >
              {meta?.icon} {meta?.label ?? node.type}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded border"
              style={{
                color: POLARITY_COLOR[node.polarity],
                borderColor: `${POLARITY_COLOR[node.polarity]}40`,
              }}
            >
              {node.polarity}
            </span>
          </div>
          <p className="text-sm font-medium text-white leading-snug">{node.label}</p>
          <ConfidenceBar value={node.confidence} />
        </div>
        <span className="text-[#8B8FA8] text-xs mt-0.5 flex-shrink-0">
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#1E2030] space-y-2">
          {node.description && (
            <p className="text-xs text-[#8B8FA8] leading-relaxed">{node.description}</p>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-[#8B8FA8]">
            <span>📝</span>
            <span>{node.evidence.length} journal entr{node.evidence.length !== 1 ? 'ies' : 'y'} contributed</span>
          </div>
          <div className="text-[10px] text-[#8B8FA8]">
            First seen {new Date(node.created_at).toLocaleDateString()} ·{' '}
            Updated {new Date(node.updated_at).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  )
}

function PatternCard({ pattern }: { pattern: BehavioralPattern }) {
  return (
    <div className="bg-[#141620] border border-[#1E2030] rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] text-[#06B6D4] font-medium uppercase tracking-widest">
            {pattern.pattern_type.replace(/_/g, ' ')}
          </span>
          <p className="text-sm text-white mt-1 leading-snug">{pattern.pattern_description}</p>
        </div>
        <span className="text-xs text-[#8B8FA8] tabular-nums flex-shrink-0">
          {Math.round(pattern.confidence * 100)}%
        </span>
      </div>
      {pattern.trigger_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {pattern.trigger_tags.slice(0, 5).map(tag => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E2030] text-[#8B8FA8]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Share button ──────────────────────────────────────────────────────────────

function ShareButton({ nodes }: { nodes: IdentityNode[] }) {
  const [loading, setLoading]   = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)

  const handleShare = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/identity/share', { method: 'POST' })
      const data = await res.json() as { url?: string }
      if (data.url) {
        setShareUrl(data.url)
        await navigator.clipboard.writeText(data.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (nodes.length === 0) return null

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7B6CF6] text-white text-sm font-medium hover:bg-[#6A5CE5] transition-colors disabled:opacity-60"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <span>🔗</span>
      )}
      {copied ? 'Copied!' : shareUrl ? 'Copy link' : 'Share Identity Card'}
    </button>
  )
}

// ── Distribution summary ──────────────────────────────────────────────────────

function TypeDistribution({ nodes }: { nodes: IdentityNode[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    nodes.forEach(n => { c[n.type] = (c[n.type] ?? 0) + 1 })
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [nodes])

  const max = Math.max(...counts.map(([, v]) => v), 1)

  return (
    <div className="bg-[#141620] border border-[#1E2030] rounded-xl p-4">
      <h3 className="text-xs font-semibold text-[#8B8FA8] uppercase tracking-widest mb-3">
        Node Distribution
      </h3>
      <div className="space-y-2">
        {counts.map(([type, count]) => {
          const meta = TYPE_META[type]
          return (
            <div key={type} className="flex items-center gap-2">
              <span className="w-20 text-[11px] text-[#8B8FA8] truncate">{meta?.label ?? type}</span>
              <div className="flex-1 h-1.5 bg-[#1E2030] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / max) * 100}%`,
                    backgroundColor: meta?.color ?? '#7B6CF6',
                  }}
                />
              </div>
              <span className="text-[11px] text-[#8B8FA8] w-4 text-right tabular-nums">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type FilterType = 'all' | string

interface Props {
  nodes:    IdentityNode[]
  patterns: BehavioralPattern[]
}

export function IdentityExplorerClient({ nodes, patterns }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [polarityFilter, setPolarityFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all')

  const typeKeys = useMemo(
    () => [...new Set(nodes.map(n => n.type))].sort(),
    [nodes],
  )

  const filtered = useMemo(
    () => nodes.filter(n => {
      if (filter !== 'all' && n.type !== filter) return false
      if (polarityFilter !== 'all' && n.polarity !== polarityFilter) return false
      return true
    }),
    [nodes, filter, polarityFilter],
  )

  if (nodes.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-3xl mb-4">🌱</p>
        <p className="text-white font-medium mb-2">No identity nodes yet</p>
        <p className="text-[#8B8FA8] text-sm">
          Write 5+ journal entries and ECHO will start building your identity web.
        </p>
        <a
          href="/"
          className="inline-block mt-6 px-4 py-2 rounded-lg bg-[#7B6CF6] text-white text-sm font-medium"
        >
          Start Journaling →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#141620] border border-[#1E2030] rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{nodes.length}</p>
          <p className="text-[11px] text-[#8B8FA8]">Total nodes</p>
        </div>
        <div className="bg-[#141620] border border-[#1E2030] rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-[#10B981]">
            {nodes.filter(n => n.polarity === 'positive').length}
          </p>
          <p className="text-[11px] text-[#8B8FA8]">Positive</p>
        </div>
        <div className="bg-[#141620] border border-[#1E2030] rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">
            {Math.round(nodes.reduce((s, n) => s + n.confidence, 0) / nodes.length * 100)}%
          </p>
          <p className="text-[11px] text-[#8B8FA8]">Avg confidence</p>
        </div>
      </div>

      {/* Distribution */}
      <TypeDistribution nodes={nodes} />

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {(['all', ...typeKeys] as FilterType[]).map(t => {
            const meta = t === 'all' ? null : TYPE_META[t]
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filter === t
                    ? 'bg-[#7B6CF6] text-white border-[#7B6CF6]'
                    : 'bg-transparent text-[#8B8FA8] border-[#1E2030] hover:border-[#7B6CF6]'
                }`}
              >
                {t === 'all' ? 'All types' : `${meta?.icon ?? ''} ${meta?.label ?? t}`}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          {(['all', 'positive', 'negative', 'neutral'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPolarityFilter(p)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                polarityFilter === p
                  ? 'bg-[#7B6CF6] text-white border-[#7B6CF6]'
                  : 'bg-transparent text-[#8B8FA8] border-[#1E2030] hover:border-[#7B6CF6]'
              }`}
            >
              {p === 'all' ? 'All polarity' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Node list */}
      <div className="space-y-3">
        {filtered.map(node => (
          <NodeCard key={node.id} node={node} />
        ))}
        {filtered.length === 0 && (
          <p className="text-[#8B8FA8] text-sm text-center py-8">
            No nodes match this filter
          </p>
        )}
      </div>

      {/* Behavioral patterns */}
      {patterns.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[#8B8FA8] uppercase tracking-widest mb-3">
            Behavioral Patterns
          </h2>
          <div className="space-y-3">
            {patterns.map(p => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        </section>
      )}

      {/* Share */}
      <div className="pt-2 pb-8">
        <ShareButton nodes={nodes} />
      </div>
    </div>
  )
}
