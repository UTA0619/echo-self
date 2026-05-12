import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import { buildEchoSystemPrompt, buildEmotionalArcSummary, selectRecentEntries } from '../../packages/ai-core/src/index.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return errorResponse('Unauthorized', 401)

    const { entry_id, content, emotion, emotion_score } = await req.json()
    if (!entry_id || !content) return errorResponse('entry_id and content are required', 400)

    const supabase = getServiceClient()

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
    if (authError || !user) return errorResponse('Unauthorized', 401)

    const { data: userData } = await supabase
      .from('users')
      .select('id, display_name, onboarding_data, timezone')
      .eq('auth_id', user.id)
      .single()

    if (!userData) return errorResponse('User not found', 404)

    // Parallel data fetch for context
    const [entriesResult, memoriesResult, emotionHistoryResult] = await Promise.all([
      supabase
        .from('entries')
        .select('content, created_at, emotion')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(10),
      // Memory retrieval via edge function invoke
      supabase.functions.invoke('memory-retrieve', {
        body: { query_text: content, limit: 5, user_id: userData.id },
      }),
      supabase
        .from('emotion_history')
        .select('date, emotion_counts, avg_valence, entry_count')
        .eq('user_id', userData.id)
        .order('date', { ascending: false })
        .limit(30),
    ])

    const recentEntries = selectRecentEntries(entriesResult.data ?? [])
    const retrievedMemories = memoriesResult.data?.memories ?? []
    const emotionalArcSummary = buildEmotionalArcSummary(emotionHistoryResult.data ?? [])

    const systemPrompt = buildEchoSystemPrompt({
      userName: userData.display_name ?? 'you',
      onboardingData: userData.onboarding_data,
      currentEntry: content,
      emotion,
      emotionScore: emotion_score,
      recentEntries,
      retrievedMemories,
      emotionalArcSummary,
    })

    // Stream from OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-2024-08-06',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content },
        ],
        temperature: 0.85,
        top_p: 0.95,
        max_tokens: 600,
        stream: true,
      }),
    })

    if (!openAIResponse.ok) {
      const err = await openAIResponse.text()
      throw new Error(`OpenAI error: ${err}`)
    }

    // Collect full response for storage
    let fullResponse = ''
    let promptTokens = 0
    let completionTokens = 0

    const reader = openAIResponse.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]')
      for (const line of lines) {
        try {
          const data = JSON.parse(line.replace('data: ', ''))
          const delta = data.choices?.[0]?.delta?.content ?? ''
          fullResponse += delta
          if (data.usage) {
            promptTokens = data.usage.prompt_tokens ?? 0
            completionTokens = data.usage.completion_tokens ?? 0
          }
        } catch { /* skip malformed chunks */ }
      }
    }

    // Store response and log usage in parallel
    await Promise.all([
      supabase.from('entries').update({ ai_response: fullResponse }).eq('id', entry_id),
      supabase.from('ai_usage').insert({
        user_id: userData.id,
        edge_function: 'echo-ai',
        model: 'gpt-4o-2024-08-06',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_cost_usd: ((promptTokens * 2.5 + completionTokens * 10) / 1_000_000),
      }),
      // Async memory ingestion (fire and forget)
      supabase.functions.invoke('memory-ingest', {
        body: { entry_id, user_id: userData.id, content },
      }),
    ])

    return jsonResponse({ response: fullResponse, success: true })
  } catch (err) {
    console.error('[echo-ai] Error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})
