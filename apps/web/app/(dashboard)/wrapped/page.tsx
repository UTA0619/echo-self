'use client'

import { useState } from 'react'

const EMOTION_EMOJI: Record<string, string> = {
  joy: '☀️', sadness: '🌧', anger: '🔥', fear: '🌑',
  surprise: '✨', disgust: '🍂', anticipation: '🌅',
  trust: '🌿', optimism: '🌤', love: '💜', awe: '🌌', neutral: '🌫',
}

interface WrappedData {
  year: number
  stats: {
    entryCount: number
    dominantEmotion: string
    avgEmotionalScore: number
    topIdentityTraits: string[]
  }
  narrative: string
  wordOfTheYear: string
  headline: string
  lookingAhead: string
}

export default function WrappedPage() {
  const [data, setData] = useState<WrappedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shared, setShared] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/wrapped', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to generate')
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!data) return
    const text = `My ${data.year} in one word: "${data.wordOfTheYear}"\n\n${data.headline}\n\nBuilt with ECHO — echo-self.app`
    if (navigator.share) {
      await navigator.share({ title: `ECHO Wrapped ${data.year}`, text })
    } else {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  if (!data) {
    return (
      <main className="min-h-screen max-w-xl mx-auto px-4 py-12 space-y-8">
        <header className="space-y-1">
          <p className="text-xs text-[#7B6CF6] font-medium uppercase tracking-widest">ECHO Wrapped</p>
          <h1 className="text-2xl font-semibold text-[#F0F0F5]">Your year in memory</h1>
          <p className="text-sm text-[#8B8FA8]">
            A portrait of who you were, who you became, and where you're headed.
          </p>
        </header>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={generate}
          disabled={loading}
          className="w-full rounded-xl bg-[#7B6CF6] py-4 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating your Wrapped…
            </span>
          ) : (
            'Generate my ECHO Wrapped →'
          )}
        </button>
      </main>
    )
  }

  const emotionEmoji = EMOTION_EMOJI[data.stats.dominantEmotion] ?? '🌫'

  return (
    <main className="min-h-screen max-w-xl mx-auto px-4 py-12 space-y-6">
      {/* Headline */}
      <div className="space-y-2">
        <p className="text-xs text-[#7B6CF6] font-medium uppercase tracking-widest">ECHO Wrapped {data.year}</p>
        <h1 className="text-xl font-semibold text-[#F0F0F5] leading-snug">{data.headline}</h1>
      </div>

      {/* Word of the year */}
      <div className="rounded-2xl bg-gradient-to-br from-[#7B6CF6]/20 to-[#141620] border border-[#7B6CF6]/20 p-6 text-center space-y-2">
        <p className="text-xs text-[#8B8FA8] uppercase tracking-widest">Your word of {data.year}</p>
        <p className="text-4xl font-bold text-[#F0F0F5]">{data.wordOfTheYear}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#141620] border border-white/5 p-4 text-center space-y-1">
          <p className="text-2xl font-bold text-[#F0F0F5]">{data.stats.entryCount}</p>
          <p className="text-[10px] text-[#8B8FA8]">entries written</p>
        </div>
        <div className="rounded-xl bg-[#141620] border border-white/5 p-4 text-center space-y-1">
          <p className="text-2xl">{emotionEmoji}</p>
          <p className="text-[10px] text-[#8B8FA8] capitalize">{data.stats.dominantEmotion}</p>
        </div>
        <div className="rounded-xl bg-[#141620] border border-white/5 p-4 text-center space-y-1">
          <p className="text-2xl font-bold text-[#F0F0F5]">{data.stats.topIdentityTraits.length}</p>
          <p className="text-[10px] text-[#8B8FA8]">traits found</p>
        </div>
      </div>

      {/* Narrative */}
      <div className="rounded-xl bg-[#141620] border border-white/5 p-5 space-y-3">
        <p className="text-xs text-[#8B8FA8] uppercase tracking-widest">Your year</p>
        <p className="text-sm text-[#F0F0F5] leading-relaxed">{data.narrative}</p>
      </div>

      {/* Identity traits */}
      {data.stats.topIdentityTraits.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[#8B8FA8] uppercase tracking-widest">Top traits</p>
          <div className="flex flex-wrap gap-2">
            {data.stats.topIdentityTraits.map(trait => (
              <span
                key={trait}
                className="text-xs px-3 py-1 rounded-full bg-[#7B6CF6]/10 border border-[#7B6CF6]/20 text-[#7B6CF6]"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Looking ahead */}
      <div className="rounded-xl bg-[#141620] border border-white/5 p-5 space-y-2">
        <p className="text-xs text-[#8B8FA8] uppercase tracking-widest">Looking ahead</p>
        <p className="text-sm text-[#F0F0F5] leading-relaxed">{data.lookingAhead}</p>
      </div>

      {/* Share */}
      <button
        onClick={handleShare}
        className="w-full rounded-xl bg-[#141620] border border-[#7B6CF6]/30 py-3 text-sm font-medium text-[#7B6CF6] hover:bg-[#7B6CF6]/10 transition-colors"
      >
        {shared ? '✓ Copied to clipboard' : 'Share my Wrapped →'}
      </button>

      <button
        onClick={() => setData(null)}
        className="w-full text-xs text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors"
      >
        Regenerate
      </button>
    </main>
  )
}
