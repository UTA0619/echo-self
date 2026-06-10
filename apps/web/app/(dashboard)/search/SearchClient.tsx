'use client'

import { useState, useCallback, useRef, useTransition } from 'react'

/* ─── Types ─────────────────────────────────────────────────────────── */

interface SearchResult {
  id: string
  content: string
  created_at: string
  emotion: string | null
  ai_response: string | null
  /** similarity score (0-1) — present in semantic mode only */
  similarity?: number
}

interface SearchResponse {
  results: SearchResult[]
  mode?: 'semantic' | 'text'
  error?: string
}

/* ─── Emotion emoji map ──────────────────────────────────────────────── */

const EMOTION_EMOJI: Record<string, string> = {
  joy:        '😊',
  sadness:    '😢',
  anger:      '😠',
  fear:       '😨',
  surprise:   '😲',
  disgust:    '😖',
  love:       '❤️',
  anxiety:    '😰',
  gratitude:  '🙏',
  hope:       '🌟',
  frustration:'😤',
  calm:       '😌',
}

function emotionEmoji(emotion: string | null): string {
  if (!emotion) return '📝'
  return EMOTION_EMOJI[emotion.toLowerCase()] ?? '📝'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function excerpt(text: string, maxLen = 240): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '…'
}

/* ─── Highlight matching words in text ──────────────────────────────── */

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-[#7B6CF6]/25 text-[#C4BCFF] rounded px-0.5">{p}</mark>
          : p
      )}
    </>
  )
}

/* ─── Result card ────────────────────────────────────────────────────── */

function ResultCard({ result, query }: { result: SearchResult; query: string }) {
  const [expanded, setExpanded] = useState(false)
  const text = result.content

  return (
    <article className="group border border-[#1E2030] bg-[#141620] rounded-xl p-4 hover:border-[#7B6CF6]/40 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none" aria-label={result.emotion ?? 'entry'}>
            {emotionEmoji(result.emotion)}
          </span>
          {result.emotion && (
            <span className="text-xs text-[#7B6CF6] font-medium capitalize">{result.emotion}</span>
          )}
          {result.similarity !== undefined && (
            <span className="text-[10px] text-[#454860] font-mono ml-1">
              {Math.round(result.similarity * 100)}% match
            </span>
          )}
        </div>
        <time className="text-xs text-[#454860] shrink-0">{formatDate(result.created_at)}</time>
      </div>

      <p className="text-sm text-[#C4C8E8] leading-relaxed">
        {expanded
          ? <Highlight text={text} query={query} />
          : <Highlight text={excerpt(text)} query={query} />
        }
      </p>

      {text.length > 240 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-xs text-[#7B6CF6] hover:text-[#A89EFF] transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {result.ai_response && (
        <details className="mt-3">
          <summary className="text-xs text-[#8B8FA8] hover:text-[#C4C8E8] cursor-pointer select-none">
            ECHO's response
          </summary>
          <p className="mt-2 text-xs text-[#8B8FA8] leading-relaxed border-l-2 border-[#7B6CF6]/30 pl-3">
            {result.ai_response}
          </p>
        </details>
      )}
    </article>
  )
}

/* ─── Empty / zero state ──────────────────────────────────────────────── */

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="text-4xl mb-4">🔍</div>
      <p className="text-[#C4C8E8] font-medium mb-1">No memories found for "{query}"</p>
      <p className="text-sm text-[#8B8FA8]">Try different words, or check your spelling.</p>
    </div>
  )
}

/* ─── Main client component ──────────────────────────────────────────── */

export function SearchClient() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [mode, setMode] = useState<'semantic' | 'text' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) {
      setResults(null)
      setError(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          setError(null)
          const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
          const json = (await res.json()) as SearchResponse

          if (json.error) {
            setError(json.error)
            setResults(null)
          } else {
            setResults(json.results)
            setMode(json.mode ?? null)
          }
        } catch {
          setError('Search failed. Please try again.')
          setResults(null)
        }
      })
    }, 420) // debounce 420ms — fast enough, doesn't hammer on every keystroke
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    search(q)
  }

  const handleClear = () => {
    setQuery('')
    setResults(null)
    setError(null)
  }

  return (
    <div className="space-y-5">
      {/* ── Search bar ── */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#454860] pointer-events-none">
          {isPending
            ? <LoadingSpinner />
            : <SearchIcon />
          }
        </span>

        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Search your memories…"
          autoFocus
          className="w-full bg-[#141620] border border-[#1E2030] rounded-xl pl-11 pr-10 py-3.5 text-[#F0F0F5] placeholder-[#454860] focus:outline-none focus:border-[#7B6CF6] transition-colors text-sm"
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#454860] hover:text-[#8B8FA8] transition-colors p-1"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Mode badge ── */}
      {mode && results && results.length > 0 && (
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            mode === 'semantic'
              ? 'bg-[#7B6CF6]/15 text-[#A89EFF]'
              : 'bg-[#F6A26C]/15 text-[#F6A26C]'
          }`}>
            {mode === 'semantic' ? '⚡ Semantic' : '🔤 Text'} search
          </span>
          <span className="text-xs text-[#454860]">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* ── Results ── */}
      {results !== null && results.length === 0 && !isPending && (
        <EmptyState query={query} />
      )}

      {results && results.length > 0 && (
        <div className="space-y-3">
          {results.map(r => (
            <ResultCard key={r.id} result={r} query={query} />
          ))}
        </div>
      )}

      {/* ── Idle hint ── */}
      {results === null && !isPending && !error && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-4xl mb-4">🧠</div>
          <p className="text-[#8B8FA8] text-sm">
            Search across your journal entries using natural language.
          </p>
          <p className="text-[#454860] text-xs mt-1">
            Powered by semantic similarity — try "when I felt hopeful" or "anxiety about work".
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Micro SVG icons ────────────────────────────────────────────────── */

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M11 11l3 3" strokeLinecap="round" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="#7B6CF6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
