'use client'

import { useEffect, useMemo, useState } from 'react'
import { IdentityWeb } from '@/components/echo/IdentityWeb'
import { EmotionalTimeline } from '@/components/echo/EmotionalTimeline'
import { PatternInsights } from '@/components/echo/PatternInsights'
import { EchoResponse } from '@/components/echo/EchoResponse'
import type { Entry } from '@/lib/entries'
import type { IdentityNode } from '@/lib/identity'
import { EMOTION_COLORS } from '@/lib/emotions'
import {
  classifyEmotion,
  generateReflection,
  extractIdentity,
  generateFutureSelf,
  seedEntries,
  seedIdentity,
  seedPatterns,
  entriesToEmotionPoints,
} from '@/lib/demo/engine'

const MIN_WORDS = 8
const PATTERNS = seedPatterns()

type Tab = 'journal' | 'identity' | 'future'
type Horizon = '1m' | '3m' | '1y'

export function DemoClient() {
  const [entries, setEntries] = useState<Entry[]>(() => seedEntries().reverse())
  const [nodes, setNodes] = useState<IdentityNode[]>(() => seedIdentity())
  const [tab, setTab] = useState<Tab>('journal')
  const [content, setContent] = useState('')
  const [thinking, setThinking] = useState(false)
  const [newId, setNewId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Render the date only after mount — avoids SSR/client locale hydration mismatch.
  const [today, setToday] = useState('')
  useEffect(() => {
    setToday(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))
    // Deep-linkable tabs: /demo?tab=identity — applied after mount (hydration-safe)
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t === 'identity' || t === 'future' || t === 'journal') setTab(t)
  }, [])

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const canSubmit = wordCount >= MIN_WORDS && !thinking

  const emotionPoints = useMemo(() => entriesToEmotionPoints(entries), [entries])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const text = content.trim()
    const { emotion, score } = classifyEmotion(text)
    const id = `live-${Date.now()}`
    const now = new Date().toISOString()

    // Surface entry immediately with a "thinking" ECHO bubble
    const base: Entry = {
      id, user_id: 'demo', content: text, voice_url: null,
      emotion, emotion_score: score, emotion_data: null, tags: [],
      ai_response: null, echo_rating: null,
      word_count: wordCount, created_at: now, updated_at: now,
    }
    setEntries((prev) => [base, ...prev])
    setNewId(id)
    setContent('')
    setThinking(true)

    // Simulate the async AI pipeline (emotion → reflection → identity growth)
    setTimeout(() => {
      const reflection = generateReflection(text, emotion)
      setEntries((prev) =>
        prev.map((en) => (en.id === id ? { ...en, ai_response: reflection } : en)),
      )

      // Identity layer growth
      setNodes((prev) => {
        const next = [...prev]
        const created = extractIdentity(text, next)
        if (created) {
          setToast(`New identity node: "${created.label}"`)
          setTimeout(() => setToast(null), 3200)
          return [...next, created]
        }
        setToast('Reinforced your identity layer')
        setTimeout(() => setToast(null), 2400)
        return next
      })
      setThinking(false)
    }, 900)
  }

  return (
    <main className="min-h-screen max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Demo banner */}
      <div className="rounded-lg bg-[#7B6CF6]/10 border border-[#7B6CF6]/30 px-3 py-2 text-center">
        <p className="text-[11px] text-[#B9B2F6]">
          ✦ DEMO MODE — fully local, no account or backend. Reflections are generated on-device.
        </p>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-geist)' }}>
          ECHO
        </h1>
        <span className="text-xs text-[#8B8FA8]" suppressHydrationWarning>
          {today}
        </span>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[#141620] p-1">
        {([['journal', 'Journal'], ['identity', 'Identity'], ['future', 'Future Self']] as const).map(
          ([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
                tab === id ? 'bg-[#0A0B0F] text-[#F0F0F5]' : 'text-[#8B8FA8] hover:text-[#F0F0F5]'
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* Journal */}
      {tab === 'journal' && (
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="rounded-xl bg-[#141620] border border-white/5 focus-within:border-[#7B6CF6]/50 transition-colors">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 2000))}
                placeholder="What's on your mind today? (try writing about work, a win, or something you're anxious about)"
                rows={5}
                className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[#F0F0F5] placeholder:text-[#8B8FA8] text-sm leading-relaxed outline-none"
              />
              <div className="px-4 pb-3">
                <span className={`text-xs tabular-nums ${wordCount < MIN_WORDS ? 'text-[#8B8FA8]' : 'text-[#7B6CF6]'}`}>
                  {wordCount < MIN_WORDS ? `${MIN_WORDS - wordCount} more words to go` : `${wordCount} words`}
                </span>
              </div>
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg bg-[#7B6CF6] py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
            >
              {thinking ? 'ECHO is reflecting…' : 'Save to ECHO'}
            </button>
          </form>

          {emotionPoints.length > 0 && <EmotionalTimeline data={emotionPoints} />}

          <section className="space-y-3">
            <h2 className="text-xs font-medium text-[#8B8FA8] uppercase tracking-widest">Recent</h2>
            {entries.map((entry) => (
              <DemoEntryCard key={entry.id} entry={entry} isNew={entry.id === newId} />
            ))}
          </section>
        </div>
      )}

      {/* Identity */}
      {tab === 'identity' && (
        <div className="space-y-6">
          <IdentityWeb nodes={nodes} />
          <PatternInsights patterns={PATTERNS} />
        </div>
      )}

      {/* Future Self */}
      {tab === 'future' && <FutureSelfPanel entries={entries} nodes={nodes} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#7B6CF6] px-4 py-2 text-xs font-medium text-white shadow-lg shadow-[#7B6CF6]/30">
          ✦ {toast}
        </div>
      )}
    </main>
  )
}

// ─── Demo entry card (local rating, reuses real EchoResponse) ─────────────────

function DemoEntryCard({ entry, isNew }: { entry: Entry; isNew: boolean }) {
  const [rating, setRating] = useState<-1 | 1 | null>(null)
  const emotionColor = entry.emotion ? EMOTION_COLORS[entry.emotion] ?? '#8B8FA8' : null

  return (
    <article className="space-y-3 rounded-xl bg-[#141620] border border-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[#F0F0F5] leading-relaxed whitespace-pre-wrap">{entry.content}</p>
        {emotionColor && (
          <span className="mt-0.5 shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: emotionColor }} title={entry.emotion ?? undefined} />
        )}
      </div>

      {(entry.ai_response || isNew) && <EchoResponse text={entry.ai_response} streaming={isNew} />}

      <div className="flex items-center justify-between text-xs text-[#8B8FA8]">
        <span>{entry.emotion ?? 'neutral'}</span>
        {entry.ai_response && (
          <div className="flex items-center gap-2">
            <button onClick={() => setRating(1)} className={rating === 1 ? 'text-[#7B6CF6]' : 'hover:text-[#F0F0F5]'} aria-label="Helpful">↑</button>
            <button onClick={() => setRating(-1)} className={rating === -1 ? 'text-[#F66C6C]' : 'hover:text-[#F0F0F5]'} aria-label="Not helpful">↓</button>
          </div>
        )}
      </div>
    </article>
  )
}

// ─── Future Self panel ────────────────────────────────────────────────────────

function FutureSelfPanel({ entries, nodes }: { entries: Entry[]; nodes: IdentityNode[] }) {
  const [horizon, setHorizon] = useState<Horizon>('3m')
  const [letter, setLetter] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  function generate() {
    setGenerating(true)
    setLetter(null)
    setTimeout(() => {
      setLetter(generateFutureSelf(entries, nodes, horizon))
      setGenerating(false)
    }, 1100)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([['1m', '1 month'], ['3m', '3 months'], ['1y', '1 year']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setHorizon(id)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium border transition-colors ${
              horizon === id
                ? 'bg-[#7B6CF6]/15 border-[#7B6CF6]/50 text-[#F0F0F5]'
                : 'bg-[#141620] border-white/5 text-[#8B8FA8] hover:text-[#F0F0F5]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={generate}
        disabled={generating}
        className="w-full rounded-lg bg-[#7B6CF6] py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50 enabled:hover:opacity-90"
      >
        {generating ? 'Simulating your trajectory…' : 'Generate a letter from your future self'}
      </button>

      {letter && (
        <article className="rounded-xl bg-gradient-to-b from-[#141620] to-[#0A0B0F] border border-[#7B6CF6]/25 p-5">
          <p className="text-xs font-medium text-[#7B6CF6] mb-3">FUTURE SELF · {horizon === '1m' ? '1 month' : horizon === '3m' ? '3 months' : '1 year'}</p>
          <p className="text-sm text-[#F0F0F5] leading-relaxed whitespace-pre-wrap">{letter}</p>
        </article>
      )}

      {!letter && !generating && (
        <p className="text-center text-xs text-[#8B8FA8] py-6">
          Grounded in your {entries.length} entries and {nodes.length} identity nodes — not optimistic guesses.
        </p>
      )}
    </div>
  )
}
