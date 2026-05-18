'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { insertEntry, getInternalUserId } from '@/lib/entries'
import type { Entry } from '@/lib/entries'

const MAX_CHARS = 2000
const MIN_WORDS = 10

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

interface EntryComposerProps {
  onEntryCreated: (entry: Entry) => void
}

export function EntryComposer({ onEntryCreated }: EntryComposerProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const realtimeRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const wordCount = countWords(content)
  const charCount = content.length
  const canSubmit = wordCount >= MIN_WORDS && charCount <= MAX_CHARS && !submitting

  const subscribeToEntry = useCallback((entryId: string, entry: Entry) => {
    const supabase = createClient()
    const channel = supabase
      .channel(`entry-${entryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'entries',
          filter: `id=eq.${entryId}`,
        },
        (payload) => {
          const updated = payload.new as Entry
          if (updated.ai_response) {
            onEntryCreated(updated)
            channel.unsubscribe()
          }
        }
      )
      .subscribe()

    realtimeRef.current = channel

    // Surface entry immediately even before AI response arrives
    onEntryCreated(entry)
  }, [onEntryCreated])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)

    try {
      const userId = await getInternalUserId()
      if (!userId) throw new Error('Not authenticated')

      const entry = await insertEntry(content.trim(), userId)
      setContent('')
      subscribeToEntry(entry.id, entry)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative rounded-xl bg-[#141620] border border-white/5 focus-within:border-[#7B6CF6]/50 transition-colors">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
          placeholder="What's on your mind today?"
          rows={5}
          className="w-full resize-none bg-transparent px-4 pt-4 pb-10 text-[#F0F0F5] placeholder:text-[#8B8FA8] text-sm leading-relaxed outline-none"
          disabled={submitting}
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
          <span className={`text-xs tabular-nums ${charCount > MAX_CHARS * 0.9 ? 'text-[#F6A26C]' : 'text-[#8B8FA8]'}`}>
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-[#7B6CF6] py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
      >
        {submitting ? 'Saving…' : 'Save to ECHO'}
      </button>
    </form>
  )
}
