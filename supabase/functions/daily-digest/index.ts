import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = 'claude-haiku-4-5-20251001'

async function compressEntriesToSummary(entries: string[], userName: string): Promise<string> {
  const joined = entries.map((c, i) => `Entry ${i + 1}:\n${c}`).join('\n\n---\n\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: `You are ECHO, a compassionate memory architect. You compress journal entries into faithful daily summaries, preserving emotional texture and personal meaning. Never editorialize. Reflect the person back to themselves accurately. Write in third person about ${userName}.`,
      messages: [
        {
          role: 'user',
          content: `Here are today's journal entries for ${userName}:\n\n${joined}\n\nWrite a faithful narrative summary (150-250 words) of today's experience. Capture the emotional arc, key themes, and any notable moments.`,
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json() as { content: Array<{ text: string }> }
  return data.content[0]?.text ?? ''
}

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  // Can be triggered by cron or manually (POST with optional { user_id, date })
  let targetUserId: string | null = null
  let targetDate: string | null = null

  if (req.method === 'POST') {
    try {
      const body = await req.json().catch(() => ({}))
      targetUserId = body.user_id ?? null
      targetDate = body.date ?? null
    } catch { /* ignore */ }
  }

  const today = targetDate ?? new Date().toISOString().split('T')[0]
  const supabase = getServiceClient()

  try {
    // Get entries for today (all users or specific user)
    let query = supabase
      .from('entries')
      .select('id, user_id, content, emotion, emotion_score, word_count, created_at')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .order('created_at', { ascending: true })

    if (targetUserId) query = query.eq('user_id', targetUserId)

    const { data: entries, error: entryError } = await query
    if (entryError) throw entryError

    if (!entries || entries.length === 0) {
      return jsonResponse({ digests_created: 0, message: 'No entries for today' })
    }

    // Group by user_id
    const byUser = entries.reduce<Record<string, typeof entries>>((acc, e) => {
      if (!acc[e.user_id]) acc[e.user_id] = []
      acc[e.user_id].push(e)
      return acc
    }, {})

    const results = []

    for (const [userId, userEntries] of Object.entries(byUser)) {
      // Skip if digest already exists for today
      const { data: existing } = await supabase
        .from('daily_digests')
        .select('id')
        .eq('user_id', userId)
        .eq('digest_date', today)
        .maybeSingle()

      if (existing) {
        results.push({ user_id: userId, status: 'skipped' })
        continue
      }

      // Get user display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single()

      const userName = profile?.display_name ?? 'you'
      const contents = userEntries.map(e => e.content)

      const summary = await compressEntriesToSummary(contents, userName)

      // Compute average emotion score for the day
      const avgEmotionScore = userEntries.reduce((s, e) => s + (e.emotion_score ?? 0), 0) / userEntries.length
      const dominantEmotion = userEntries
        .filter(e => e.emotion)
        .reduce<Record<string, number>>((acc, e) => {
          acc[e.emotion!] = (acc[e.emotion!] ?? 0) + 1
          return acc
        }, {})
      const topEmotion = Object.entries(dominantEmotion).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      // Insert digest — table created via migration below
      const { error: insertError } = await supabase.from('daily_digests').insert({
        user_id: userId,
        digest_date: today,
        summary,
        entry_count: userEntries.length,
        total_words: userEntries.reduce((s, e) => s + (e.word_count ?? 0), 0),
        dominant_emotion: topEmotion,
        avg_emotion_score: avgEmotionScore,
        source_entry_ids: userEntries.map(e => e.id),
      })

      if (insertError) throw insertError
      results.push({ user_id: userId, status: 'created' })
    }

    return jsonResponse({
      digests_created: results.filter(r => r.status === 'created').length,
      digests_skipped: results.filter(r => r.status === 'skipped').length,
      date: today,
      success: true,
    })
  } catch (err) {
    console.error('daily-digest error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Unknown error')
  }
})
