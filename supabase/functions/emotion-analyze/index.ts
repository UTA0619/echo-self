import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import { analyzeEmotion } from '../../packages/ai-core/src/index.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return errorResponse('Unauthorized', 401)

    const { content, entry_id } = await req.json()
    if (!content) return errorResponse('content required', 400)

    const emotionData = await analyzeEmotion(OPENAI_API_KEY, content)

    if (entry_id) {
      const supabase = getServiceClient()
      await supabase.from('entries').update({
        emotion: emotionData.emotion,
        emotion_score: emotionData.intensity,
        emotion_data: emotionData,
        tags: emotionData.themes,
      }).eq('id', entry_id)
    }

    return jsonResponse({ ...emotionData, success: true })
  } catch (err) {
    console.error('[emotion-analyze] Error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})
