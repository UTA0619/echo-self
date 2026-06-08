/**
 * echo-ai: Core AI journaling response generator.
 *
 * Generates a personalised, memory-grounded response to a journal entry
 * using Claude Sonnet. Runs a safety check first; for crisis-level signals
 * the static resource message is returned without generation.
 *
 * Input:  Authorization header (Bearer <user JWT>) + { entry_id, content, emotion?, emotion_score? }
 * Output: { response: string, success: boolean, crisis?: boolean }
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import {
  buildEchoSystemPrompt,
  buildEmotionalArcSummary,
  selectRecentEntries,
} from '../_shared/prompts/echo.ts'
import {
  buildSafetyResponseSystemPrompt,
  buildSafetyResponsePrompt,
  CRISIS_RESOURCES_STATIC,
} from '../_shared/prompts/safety.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL_SONNET      = 'claude-sonnet-4-6'
const MODEL_HAIKU       = 'claude-haiku-4-5-20251001'

// ── Claude call helper ────────────────────────────────────────────────────────

async function callClaude(
  model:   string,
  system:  string,
  userMsg: string,
  maxTokens = 600,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json() as {
    content: Array<{ text: string }>
    usage:   { input_tokens: number; output_tokens: number }
  }

  return data.content[0]?.text ?? ''
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return errorResponse('Unauthorized', 401)

    const { entry_id, content, emotion, emotion_score } = await req.json()
    if (!entry_id || !content) return errorResponse('entry_id and content are required', 400)

    const supabase = getServiceClient()

    // Authenticate user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      auth.replace('Bearer ', ''),
    )
    if (authError || !user) return errorResponse('Unauthorized', 401)

    const { data: userData } = await supabase
      .from('users')
      .select('id, display_name, onboarding_data, timezone')
      .eq('auth_id', user.id)
      .single()

    if (!userData) return errorResponse('User not found', 404)

    // 1. Parallel context fetch
    const [entriesResult, memoriesResult, emotionHistoryResult] = await Promise.all([
      supabase
        .from('entries')
        .select('content, created_at, emotion')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.functions.invoke('memory-retrieve', {
        body: { query_text: content, limit: 5, user_id: userData.id },
      }),
      supabase
        .from('emotion_history_7d')
        .select('date, dominant_emotion, avg_valence')
        .eq('user_id', userData.id)
        .order('date', { ascending: false })
        .limit(7),
    ])

    const recentEntries      = selectRecentEntries(entriesResult.data ?? [])
    const retrievedMemories  = memoriesResult.data?.memories ?? []
    const emotionalArcSummary = buildEmotionalArcSummary(emotionHistoryResult.data ?? [])

    // 2. Safety check (pass entry_id so crisis events are linked)
    const safetyRes = await supabase.functions.invoke('safety-check', {
      body: { user_id: userData.id, entry_id, content },
    })
    const safety = safetyRes.data ?? { safe: true, risk_level: 'none' }

    // 3. Handle crisis — return static resources, no generation
    if (!safety.safe || safety.risk_level === 'crisis') {
      await supabase
        .from('entries')
        .update({ ai_response: CRISIS_RESOURCES_STATIC })
        .eq('id', entry_id)

      return jsonResponse({ response: CRISIS_RESOURCES_STATIC, success: true, crisis: true })
    }

    // 4. Build main Echo system prompt
    const systemPrompt = buildEchoSystemPrompt({
      userName:         userData.display_name ?? 'you',
      onboardingData:   userData.onboarding_data,
      currentEntry:     content,
      emotion,
      emotionScore:     emotion_score,
      recentEntries,
      retrievedMemories,
      emotionalArcSummary,
    })

    // 5. Generate response with Claude Sonnet
    let echoResponse = await callClaude(MODEL_SONNET, systemPrompt, content, 600)

    // 6. For moderate/high risk — append a compassionate safety note
    if (safety.risk_level === 'moderate' || safety.risk_level === 'high') {
      try {
        const safetyNote = await callClaude(
          MODEL_HAIKU,
          buildSafetyResponseSystemPrompt(),
          buildSafetyResponsePrompt({
            userName:   userData.display_name ?? 'you',
            content,
            riskLevel:  safety.risk_level as 'moderate' | 'high',
            emotionArc: emotionalArcSummary,
          }),
          200,
        )
        if (safetyNote.trim()) {
          echoResponse = `${echoResponse}\n\n---\n\n${safetyNote}`
        }
      } catch (safetyErr) {
        // Fall back to static intervention if Claude call fails
        const staticNote = safety.intervention ?? ''
        if (staticNote) echoResponse = `${echoResponse}\n\n---\n\n${staticNote}`
        console.warn('[echo-ai] safety note generation failed:', safetyErr)
      }
    }

    // 7. Persist response and fire async pipelines
    await Promise.all([
      supabase
        .from('entries')
        .update({ ai_response: echoResponse })
        .eq('id', entry_id),

      // Memory ingestion (fire-and-forget)
      supabase.functions.invoke('memory-ingest', {
        body: { entry_id, user_id: userData.id, content },
      }),

      // Behavioral tagging (fire-and-forget)
      supabase.functions.invoke('behavioral-tag', {
        body: { entry_id, user_id: userData.id, content },
      }),

      // Identity node extraction (fire-and-forget)
      supabase.functions.invoke('identity-infer', {
        body: { entry_id, user_id: userData.id, content },
      }),
    ])

    return jsonResponse({ response: echoResponse, success: true })
  } catch (err) {
    console.error('[echo-ai] error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})
