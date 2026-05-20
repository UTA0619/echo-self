'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { VoiceRecorder } from './VoiceRecorder'
import type { Entry } from '@/lib/entries'

const MAX_CHARS = 2000
const MIN_WORDS = 10

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

interface EntryComposerProps {
  onEntryCreated: (entry: Entry) => void
  /** Number of entries the user has submitted today (for free tier display) */
  todayCount?: number
  isPremium?: boolean
}

export function EntryComposer({ onEntryCreated, todayCount = 0, isPremium = false }: EntryComposerProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const wordCount = countWords(content)
  const charCount = content.length
  const canSubmit = wordCount >= MIN_WORDS && charCount <= MAX_CHARS && !submitting && !limitReached

  /** Subscribe to Realtime so AI response appears automatically */
  const subscribeToEntryAI = useCallback(
    (entryId: string, baseEntry: Entry) => {
      // Surface entry immediately — AI response will update it via Realtime
      onEntryCreated(baseEntry)

      const supabase = createClient()
      const channel = supabase
        .channel(`entry-ai-${entryId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'entries', filter: `id=eq.${entryId}` },
          (payload) => {
            const updated = payload.new as Entry
            if (updated.ai_response) {
              onEntryCreated(updated)
              channel.unsubscribe()
              channelRef.current = null
            }
          },
        )
        .subscribe()

      channelRef.current = channel

      // Safety timeout: unsubscribe after 60s even if AI never responds
      setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.unsubscribe()
          channelRef.current = null
        }
      }, 60_000)
    },
    [onEntryCreated],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (res.status === 403) {
        const body = await res.json() as { error: string; message: string }
        if (body.error === 'limit_reached') {
          setLimitReached(true)
          setError(body.message)
          return
        }
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Failed to save entry')
      }

      const entry = await res.json() as Entry
      setContent('')
      subscribeToEntryAI(entry.id, entry)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const DAILY_LIMIT = 3
  const showFreeTierBar = !isPremium

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Free tier usage bar */}
      {showFreeTierBar && (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-0.5">
            {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < todayCount ? 'bg-[#7B6CF6]' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-[#8B8FA8] tabular-nums shrink-0">
            {todayCount}/{DAILY_LIMIT} today
          </span>
        </div>
      )}

      <div className="relative rounded-xl bg-[#141620] border border-white/5 focus-within:border-[#7B6CF6]/50 transition-colors">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
          placeholder={limitReached ? 'Upgrade to Pro for unlimited entries.' : "What's on your mind today?"}
          rows={5}
          className="w-full resize-none bg-transparent px-4 pt-4 pb-10 text-[#F0F0F5] placeholder:text-[#8B8FA8] text-sm leading-relaxed outline-none disabled:opacity-50"
          disabled={submitting || limitReached}
        />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          <span
            className={`text-xs tabular-nums ${
              wordCount < MIN_WORDS ? 'text-[#8B8FA8]' : 'text-[#7B6CF6]'
            }`}
          >
            {wordCount < MIN_WORDS
              ? `${MIN_WORDS - wordCount} more word${MIN_WORDS - wordCount === 1 ? '' : 's'} to go`
              : `${wordCount} words`}
          </span>
          <span
            className={`text-xs tabular-nums ${
              charCount > MAX_CHARS * 0.9 ? 'text-[#F6A26C]' : 'text-[#8B8FA8]'
            }`}
          >
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {!limitReached && (
          <VoiceRecorder
            onTranscription={(text) =>
              setContent((prev) => (prev ? `${prev} ${text}` : text).slice(0, MAX_CHARS))
            }
          />
        )}
        {error && (
          <p className={`text-xs ${limitReached ? 'text-[#F6A26C]' : 'text-red-400'}`}>
            {error}
          </p>
        )}
      </div>

      {limitReached ? (
        <a
          href="/settings?upgrade=1"
          className="block w-full rounded-lg bg-[#7B6CF6] py-2.5 text-center text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Upgrade to Pro — Unlimited entries →
        </a>
      ) : (
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-[#7B6CF6] py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
        >
          {submitting ? 'Saving…' : 'Save to ECHO'}
        </button>
      )}
    </form>
  )
}
