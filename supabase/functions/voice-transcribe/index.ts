/**
 * voice-transcribe: Accepts a base64-encoded audio file, sends it to
 * OpenAI Whisper, returns the transcript text.
 *
 * POST body: { audio_base64: string, mime_type?: string, language?: string }
 * Response:  { transcript: string, duration_sec: number }
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

serve(async (req: Request) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return errorResponse('Unauthorized', 401)

    const { audio_base64, mime_type = 'audio/m4a', language } = await req.json()

    if (!audio_base64) return errorResponse('audio_base64 is required', 400)

    // Decode base64 → Uint8Array
    const binaryString = atob(audio_base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Determine file extension from mime_type
    const ext = mime_type.includes('webm') ? 'webm'
      : mime_type.includes('mp4') || mime_type.includes('m4a') ? 'm4a'
      : mime_type.includes('wav') ? 'wav'
      : mime_type.includes('ogg') ? 'ogg'
      : 'm4a'

    // Build multipart form for Whisper API
    const form = new FormData()
    form.append('file', new Blob([bytes], { type: mime_type }), `recording.${ext}`)
    form.append('model', 'whisper-1')
    form.append('response_format', 'verbose_json')
    if (language) form.append('language', language)

    const t0 = Date.now()

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    })

    if (!whisperRes.ok) {
      const errText = await whisperRes.text()
      console.error('[voice-transcribe] Whisper error:', errText)
      return errorResponse(`Whisper API error: ${whisperRes.status}`, 502)
    }

    const result = await whisperRes.json() as {
      text: string
      duration?: number
      language?: string
    }

    return jsonResponse({
      transcript: result.text?.trim() ?? '',
      duration_sec: result.duration ?? Math.round((Date.now() - t0) / 1000),
      detected_language: result.language,
    })
  } catch (err) {
    console.error('[voice-transcribe] Error:', err)
    return errorResponse('Internal error', 500)
  }
})
