/**
 * safety-check: Emotional safety guardrails for ECHO.
 *
 * Checks for crisis signals in user content using OpenAI Moderation API
 * and Claude pattern analysis. Returns safety assessment + intervention copy.
 *
 * Called by echo-ai before generating responses to entries.
 * Input: { user_id, entry_id?, content, recent_emotion_scores? }
 * Output: { safe: boolean, risk_level: 'none'|'low'|'moderate'|'high'|'crisis', intervention?: string }
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const OPENAI_API_KEY    = Deno.env.get('OPENAI_API_KEY')!
// Reserved for future Claude-based analysis
const _ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

// Crisis keywords — fast pre-check before API calls
const CRISIS_SIGNALS = [
  'kill myself', 'end my life', 'want to die', 'suicidal', 'suicide',
  'self-harm', 'cut myself', 'hurt myself', 'not worth living',
  'no reason to live', 'better off dead', 'overdose',
]

const CRISIS_RESOURCES = `**If you're in crisis, please reach out:**

🆘 **988 Suicide & Crisis Lifeline** — Call or text **988** (US)
💬 **Crisis Text Line** — Text HOME to **741741**
🌍 **International Association for Suicide Prevention** — https://www.iasp.info/resources/Crisis_Centres/

ECHO is not a substitute for professional mental health support. You deserve real help.`

const MODERATE_INTERVENTION = `It sounds like you're carrying something heavy right now. ECHO hears you.

Remember: what you're feeling is valid, and difficult moments do pass. If things feel overwhelming, speaking with someone you trust — or a professional — can make a real difference.

Crisis Text Line: Text HOME to 741741`

// ── Logging helper ────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low'

async function logCrisisEvent(
  userId: string,
  entryId: string | null,
  severity: Severity,
  triggerPhrase: string | null,
  detectedTags: string[],
): Promise<void> {
  try {
    const supabase = getServiceClient()
    await supabase.rpc('upsert_crisis_event', {
      p_user_id:        userId,
      p_entry_id:       entryId,
      p_severity:       severity,
      p_trigger_phrase: triggerPhrase,
      p_detected_tags:  detectedTags,
    })
  } catch (err) {
    // Logging must never crash the main safety flow
    console.error('[safety-check] failed to log crisis event:', err)
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors()

  try {
    const { user_id, entry_id = null, content, recent_emotion_scores } = await req.json()
    if (!content) return errorResponse('content required', 400)

    const contentLower = content.toLowerCase()

    // 1. Fast keyword check for obvious crisis signals
    const matchedSignal = CRISIS_SIGNALS.find(signal => contentLower.includes(signal)) ?? null
    if (matchedSignal) {
      if (user_id) {
        await logCrisisEvent(user_id, entry_id, 'critical', matchedSignal, ['keyword_match'])
      }

      return jsonResponse({
        safe: false,
        risk_level: 'crisis',
        intervention: CRISIS_RESOURCES,
      })
    }

    // 2. OpenAI Moderation API
    const modRes = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: content }),
    })

    let moderationFlagged = false
    let moderationCategory = ''

    if (modRes.ok) {
      const modData = await modRes.json()
      const result = modData.results?.[0]
      if (result?.flagged) {
        moderationFlagged = true
        const categories = result.categories ?? {}
        moderationCategory = Object.entries(categories)
          .filter(([, v]) => v)
          .map(([k]) => k)[0] ?? 'unknown'

        // Self-harm categories → treat as crisis
        if (
          categories['self-harm'] ||
          categories['self-harm/intent'] ||
          categories['self-harm/instructions']
        ) {
          if (user_id) {
            await logCrisisEvent(
              user_id, entry_id, 'critical',
              null, ['openai_moderation', moderationCategory],
            )
          }

          return jsonResponse({
            safe: false,
            risk_level: 'crisis',
            intervention: CRISIS_RESOURCES,
          })
        }

        // Other moderation flags → high risk
        if (user_id) {
          await logCrisisEvent(
            user_id, entry_id, 'high',
            null, ['openai_moderation', moderationCategory],
          )
        }
      }
    }

    // 3. Check sustained negative emotion trajectory (3+ consecutive low scores)
    let hasNegativeTrajectory = false
    if (recent_emotion_scores && Array.isArray(recent_emotion_scores) && recent_emotion_scores.length >= 3) {
      const last3 = recent_emotion_scores.slice(-3)
      hasNegativeTrajectory = last3.every((s: number) => s < -0.6)
    }

    // 4. Return risk assessment
    if (moderationFlagged || hasNegativeTrajectory) {
      if (user_id && hasNegativeTrajectory) {
        await logCrisisEvent(
          user_id, entry_id, 'medium',
          null, ['negative_emotion_trajectory'],
        )
      }

      return jsonResponse({
        safe: true,
        risk_level: 'moderate',
        intervention: MODERATE_INTERVENTION,
        show_resources: true,
      })
    }

    return jsonResponse({ safe: true, risk_level: 'none' })
  } catch (err) {
    // Safety checks must never crash the main flow — fail open with low risk
    console.error('[safety-check] error:', err)
    return jsonResponse({ safe: true, risk_level: 'none', error: String(err) })
  }
})
