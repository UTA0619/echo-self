/**
 * pattern-detect: Analyze a user's last 30 days of behavioral tags
 * to surface recurring behavioral patterns using Claude Sonnet.
 *
 * Triggered by: daily cron after behavioral-tag runs, or manual POST.
 * Input:  { user_id }
 * Output: upserts rows into behavioral_patterns table
 *
 * Tag data comes from entry_behavioral_tags (not entries.tags directly).
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import {
  buildPatternDetectSystemPrompt,
  buildPatternDetectPrompt,
} from '../../packages/ai-core/src/prompts/pattern-detect.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL             = 'claude-sonnet-4-6'
const PERIOD_DAYS       = 30

// ── Types ─────────────────────────────────────────────────────────────────────

interface DetectedPattern {
  pattern_type:        string
  pattern_description: string
  frequency_days:      number
  confidence:          number
  trigger_tags:        string[]
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors()

  try {
    const { user_id } = await req.json()
    if (!user_id) return errorResponse('user_id required', 400)

    const supabase = getServiceClient()
    const since    = new Date(Date.now() - PERIOD_DAYS * 86_400_000).toISOString()

    // 1. Pull behavioral tags for last 30 days via entry_behavioral_tags JOIN entries
    const { data: tagRows, error: tagsErr } = await supabase
      .from('entry_behavioral_tags')
      .select('entry_id, tags, dominant_theme, created_at')
      .eq('user_id', user_id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (tagsErr) return errorResponse(tagsErr.message, 500)
    if (!tagRows || tagRows.length < 3) {
      return jsonResponse({ patterns: [], message: 'Not enough tagged entries for pattern detection' })
    }

    // 2. Pull emotion distribution from entries
    const { data: emotionRows } = await supabase
      .from('entries')
      .select('emotion')
      .eq('user_id', user_id)
      .gte('created_at', since)
      .not('emotion', 'is', null)

    const emotionDist: Record<string, number> = {}
    const total = emotionRows?.length ?? 0
    if (total > 0) {
      for (const row of emotionRows ?? []) {
        emotionDist[row.emotion] = ((emotionDist[row.emotion] ?? 0) + 1)
      }
      for (const key of Object.keys(emotionDist)) {
        emotionDist[key] = emotionDist[key] / total
      }
    }

    // 3. Aggregate tag occurrences
    const tagMap = new Map<string, { tag: string; count: number; dates: string[] }>()

    for (const row of tagRows) {
      const date = row.created_at.slice(0, 10)
      for (const tag of (row.tags as string[] ?? [])) {
        const existing = tagMap.get(tag) ?? { tag, count: 0, dates: [] }
        existing.count++
        if (!existing.dates.includes(date)) existing.dates.push(date)
        tagMap.set(tag, existing)
      }
    }

    // Only tags appearing 3+ times warrant analysis
    const significantTags = Array.from(tagMap.values())
      .filter((t) => t.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    if (significantTags.length === 0) {
      return jsonResponse({ patterns: [], message: 'No significant tag frequency yet' })
    }

    // 4. Call Claude Sonnet via prompt builder
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1024,
        system:     buildPatternDetectSystemPrompt(),
        messages:   [{
          role:    'user',
          content: buildPatternDetectPrompt({
            userName:              'this user',
            tagOccurrences:        significantTags,
            totalEntriesAnalyzed:  tagRows.length,
            periodDays:            PERIOD_DAYS,
            emotionDistribution:   total > 0 ? emotionDist : undefined,
          }),
        }],
      }),
    })

    if (!response.ok) {
      return errorResponse(`Claude error: ${response.status}`, 502)
    }

    const aiResult = await response.json() as { content: Array<{ text: string }> }
    const rawText  = aiResult.content[0]?.text ?? ''

    let patterns: DetectedPattern[] = []
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/)
      if (jsonMatch) patterns = JSON.parse(jsonMatch[0]) as DetectedPattern[]
    } catch {
      return errorResponse('Failed to parse Claude pattern response', 500)
    }

    // 5. For each pattern, find which entry IDs are evidence (match trigger tags)
    const entryIdsWithTag = (triggerTags: string[]): string[] =>
      tagRows
        .filter((r) => (r.tags as string[]).some((t) => triggerTags.includes(t)))
        .map((r) => r.entry_id)
        .slice(0, 10)

    // 6. Upsert patterns
    const now     = new Date().toISOString()
    const results = []

    for (const pattern of patterns) {
      if (!pattern.pattern_type || !pattern.pattern_description) continue

      const evidenceIds = entryIdsWithTag(pattern.trigger_tags ?? [])

      // Check for existing similar pattern
      const { data: existing } = await supabase
        .from('behavioral_patterns')
        .select('id, confidence, frequency_days')
        .eq('user_id', user_id)
        .eq('pattern_type', pattern.pattern_type)
        .eq('is_active', true)
        .ilike('pattern_description', `${pattern.pattern_description.slice(0, 60)}%`)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('behavioral_patterns')
          .update({
            confidence:         Math.min(0.98, (existing.confidence + pattern.confidence) / 2 + 0.03),
            frequency_days:     Math.round((existing.frequency_days + pattern.frequency_days) / 2),
            last_seen_at:       now,
            evidence_entry_ids: evidenceIds,
            trigger_tags:       pattern.trigger_tags ?? [],
          })
          .eq('id', existing.id)

        results.push({ action: 'updated', id: existing.id, error: error?.message })
      } else {
        const { data: inserted, error } = await supabase
          .from('behavioral_patterns')
          .insert({
            user_id,
            pattern_type:        pattern.pattern_type,
            pattern_description: pattern.pattern_description,
            frequency_days:      pattern.frequency_days,
            confidence:          pattern.confidence,
            trigger_tags:        pattern.trigger_tags ?? [],
            evidence_entry_ids:  evidenceIds,
            is_active:           true,
            last_seen_at:        now,
          })
          .select('id')
          .single()

        results.push({ action: 'inserted', id: inserted?.id, error: error?.message })
      }
    }

    console.log(JSON.stringify({ msg: 'pattern_detect_complete', user_id, patterns_found: patterns.length }))
    return jsonResponse({ patterns, results })
  } catch (err) {
    console.error('[pattern-detect] error:', err)
    return errorResponse(String(err), 500)
  }
})
