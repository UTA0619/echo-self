'use client'

import { useState } from 'react'
import { rateEntry } from '@/lib/entries'
import { EchoResponse } from './EchoResponse'
import type { Entry } from '@/lib/entries'

const EMOTION_COLORS: Record<string, string> = {
  joy: '#F6A26C',
  sadness: '#6C9EF6',
  anger: '#F66C6C',
  fear: '#B46CF6',
  surprise: '#6CF6C8',
  disgust: '#A8A26C',
  neutral: '#8B8FA8',
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface EntryCardProps {
  entry: Entry
  isNew?: boolean
}

export function EntryCard({ entry, isNew = false }: EntryCardProps) {
  const [rating, setRating] = useState<-1 | 1 | null>(entry.echo_rating)
  const [ratingPending, setRatingPending] = useState(false)

  const emotionColor = entry.emotion ? (EMOTION_COLORS[entry.emotion] ?? '#8B8FA8') : null

  async function handleRate(value: -1 | 1) {
    if (ratingPending || rating === value) return
    setRatingPending(true)
    try {
      await rateEntry(entry.id, value)
      setRating(value)
    } finally {
      setRatingPending(false)
    }
  }

  return (
    <article className="space-y-3 rounded-xl bg-[#141620] border border-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[#F0F0F5] leading-relaxed whitespace-pre-wrap line-clamp-6">
          {entry.content}
        </p>
        {emotionColor && (
          <span
            className="mt-0.5 shrink-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: emotionColor }}
            title={entry.emotion ?? undefined}
          />
        )}
      </div>

      {(entry.ai_response || isNew) && (
        <EchoResponse text={entry.ai_response} streaming={isNew && !entry.ai_response} />
      )}

      <div className="flex items-center justify-between text-xs text-[#8B8FA8]">
        <span>{formatRelativeTime(entry.created_at)}</span>

        {entry.ai_response && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRate(1)}
              disabled={ratingPending}
              className={`transition-colors ${rating === 1 ? 'text-[#7B6CF6]' : 'hover:text-[#F0F0F5]'}`}
              aria-label="Helpful"
            >
              ↑
            </button>
            <button
              onClick={() => handleRate(-1)}
              disabled={ratingPending}
              className={`transition-colors ${rating === -1 ? 'text-[#F66C6C]' : 'hover:text-[#F0F0F5]'}`}
              aria-label="Not helpful"
            >
              ↓
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
