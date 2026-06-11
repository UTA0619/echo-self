/**
 * useMorningReport
 *
 * Fetches everything needed for the Morning Report screen:
 *  - Current streak + longest streak
 *  - 7-day emotion arc
 *  - Yesterday's entry (or most recent entry)
 *  - Today's AI insight (from notifications table or on-demand Claude Haiku)
 *
 * Caches for the session — doesn't re-fetch unless userId changes.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'

export interface EmotionDay {
  date: string           // YYYY-MM-DD
  emotion: string | null
  valence: number        // -1 to 1
}

export interface MorningReportData {
  streak:         number
  longestStreak:  number
  emotionArc:     EmotionDay[]       // last 7 days, newest first
  yesterdayEntry: string | null      // content excerpt or null
  yesterdayEmotion: string | null
  morningInsight: string | null      // AI insight for today
  hasEntryToday:  boolean
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function useMorningReport(userId: string | undefined) {
  const [data,   setData]   = useState<MorningReportData | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error,  setError]  = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setStatus('loading')
    setError(null)

    try {
      const today     = new Date()
      const todayStr  = today.toISOString().split('T')[0]!
      const yesterday = new Date(today.getTime() - 86_400_000)
      const yestStr   = yesterday.toISOString().split('T')[0]!

      const [
        userRes,
        emotionRes,
        recentEntriesRes,
        insightRes,
      ] = await Promise.all([
        // Streak
        supabase
          .from('users')
          .select('current_streak, longest_streak')
          .eq('id', userId)
          .maybeSingle(),

        // 7-day emotion arc
        supabase
          .from('emotion_history_7d')
          .select('date, dominant_emotion, avg_valence')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(7),

        // Last 2 entries (to get yesterday + today check)
        supabase
          .from('entries')
          .select('content, emotion, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(2),

        // Today's insight from notifications table (if already sent)
        supabase
          .from('notifications')
          .select('body')
          .eq('user_id', userId)
          .eq('type', 'daily_insight')
          .gte('created_at', `${todayStr}T00:00:00.000Z`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      const entries  = recentEntriesRes.data ?? []
      const todayEntry    = entries.find((e) => e.created_at.startsWith(todayStr))
      const yesterdayEntry = entries.find((e) => e.created_at.startsWith(yestStr))
        ?? (entries.length > 0 ? entries[0] : null)

      const emotionArc: EmotionDay[] = (emotionRes.data ?? []).map((row) => ({
        date:    row.date as string,
        emotion: row.dominant_emotion as string | null,
        valence: (row.avg_valence as number) ?? 0,
      }))

      setData({
        streak:           userRes.data?.current_streak ?? 0,
        longestStreak:    userRes.data?.longest_streak ?? 0,
        emotionArc,
        yesterdayEntry:   yesterdayEntry?.content?.slice(0, 300) ?? null,
        yesterdayEmotion: yesterdayEntry?.emotion ?? null,
        morningInsight:   insightRes.data?.body ?? null,
        hasEntryToday:    !!todayEntry,
      })
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  return { data, status, error, refresh: load }
}
