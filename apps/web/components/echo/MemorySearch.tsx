'use client'

import { useState, useCallback, useRef } from 'react'
import type { Entry } from '@/lib/entries'

interface SearchResult {
  id: string
  content: string
  created_at: string
  emotion: string | null
  ai_response: string | null
  similarity?: number
}

const EMOTION_COLORS: Record<string, string> = {
  joy: '#F6A26C',
  sadness: '#6C9EF6',
  anger: '#F66C6C',
  fear: '#B46CF6',
  surprise: '#6CF6C8',
  neutral: '#8B8FA8',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

interface MemorySearchProps {
  onSelectEntry?: (entry: Entry) => void
}

export function MemorySearch({ onSelectEntry }: MemorySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'semantic' | 'text' | null>(null)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setMode(null); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Search failed')
      const json = await res.json() as { results: SearchResult[]; mode: 'semantic' | 'text' }
      setResults(json.results ?? [])
      setMode(json.mode)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); setResults([]) }
  }

  return (
    <div className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8FA8] text-sm pointer-events-none">
          ⌕
        </span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Search your memories…"
          className="w-full rounded-lg bg-[#141620] border border-white/5 pl-8 pr-4 py-2.5 text-sm text-[#F0F0F5] placeholder:text-[#8B8FA8] outline-none focus:border-[#7B6CF6]/50 transition-colors"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#7B6CF6] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && (query.length >= 2) && (
        <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl bg-[#141620] border border-white/10 shadow-2xl overflow-hidden">
          {results.length === 0 && !loading && (
            <p className="px-4 py-3 text-sm text-[#8B8FA8]">No memories found.</p>
          )}

          {results.length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs text-[#8B8FA8]">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-[#7B6CF6]">
                  {mode === 'semantic' ? 'semantic' : 'text'} search
                </span>
              </div>
              <ul className="max-h-80 overflow-y-auto divide-y divide-white/5">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors space-y-1"
                      onMouseDown={() => onSelectEntry?.(r as unknown as Entry)}
                    >
                      <p className="text-sm text-[#F0F0F5] line-clamp-2 leading-snug">
                        {r.content}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8B8FA8]">{formatDate(r.created_at)}</span>
                        {r.emotion && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: EMOTION_COLORS[r.emotion] ?? '#8B8FA8' }}
                          />
                        )}
                        {r.similarity != null && (
                          <span className="text-xs text-[#8B8FA8]">
                            {Math.round(r.similarity * 100)}% match
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
