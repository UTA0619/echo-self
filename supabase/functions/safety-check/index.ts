/**
 * safety-check: Emotional safety guardrails for ECHO.
 *
 * Checks for crisis signals in user content using:
 *  1. Fast keyword pre-check (no API cost)
 *  2. Claude Haiku safety classification
 *  3. Sustained negative emotion trajectory heuristic
 *
 * Returns safety assessment + intervention copy.
 * Called by echo-ai before generating responses to entries.
 *
 * Input: { user_id, entry_id?, content, recent_emotion_scores? }
 * Output: { safe: boolean, risk_level: 'none'|'low'|'moderate'|'high'|'crisis', intervention?: string }
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

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

// ── Claude Haiku safety classification ───────────────────────────────────────

type SafetyClass = 'safe' | 'low_risk' | 'moderate_risk' | 'high_risk' | 'self_harm'

async function claudeSafetyCheck(content: string): Promise<SafetyClass> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 30,
        system: `You are a mental health safety classifier. Classify the emotional safety risk in user-written text.
Output ONLY one of these labels (no other text):
- safe           (no emotional distress or minor everyday stress)
- low_risk       (mild sadness, frustration, or worry — normal human emotions)
- moderate_risk  (significant distress, hopelessness, or talk of severe worthlessness)
- high_risk      (thoughts of self-harm without explicit plans, or severe despair)
- self_harm      (explicit mention of self-harm, suicide plans, or intent to hurt oneself)`,
        messages: [{
          role:    'user',
          content: `Classify this text:\n\n${content.slice(0, 1000)}`,
        }],
      }),
    })

    if (!res.ok) throw new Error(`Claude error: ${res.status}`)

    const json = await res.json() as { content: Array<{ text: string }> }
    const label = json.content?.[0]?.text?.trim().toLowerCase() ?? 'safe'

    const VALID: SafetyClass[] = ['safe', 'low_risk', 'moderate_risk', 'high_risk', 'self_harm']
    return VALID.includes(label as SafetyClass) ? (label as SafetyClass) : 'safe'
  } catch (err) {
    console.error('[safety-check] Claude classify error:', err)
    return 'safe'  // fail open — never block user
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors()

  try {
    const { user_id, entry_id = null, content, recent_emotion_scores } = await req.json()
    if (!content) return errorResponse('content required', 400)

    const contentLower = content.toLowerCase()

    // 1. Fast keyword check — no API cost, catches obvious signals
    const matchedSignal = CRISIS_SIGNALS.find(signal => contentLower.includes(signal)) ?? null
    if (matchedSignal) {
      if (user_id) {
        await logCrisisEvent(user_id, entry_id, 'critical', matchedSignal, ['keyword_match'])
      }
      return jsonResponse({ safe: false, risk_level: 'crisis', intervention: CRISIS_RESOURCES })
    }

    // 2. Claude Haiku safety classification
    const safetyClass = await claudeSafetyCheck(content)

    if (safetyClass === 'self_harm') {
      if (user_id) {
        await logCrisisEvent(user_id, entry_id, 'critical', null, ['claude_self_harm'])
      }
      return jsonResponse({ safe: false, risk_level: 'crisis', intervention: CRISIS_RESOURCES })
    }

    if (safetyClass === 'high_risk') {
      if (user_id) {
        await logCrisisEvent(user_id, entry_id, 'high', null, ['claude_high_risk'])
      }
      return jsonResponse({
        safe:           true,
        risk_level:     'high',
        intervention:   MODERATE_INTERVENTION,
        show_resources: true,
      })
    }

    // 3. Sustained negative emotion trajectory (3+ consecutive low scores)
    let hasNegativeTrajectory = false
    if (recent_emotion_scores && Array.isArray(recent_emotion_scores) && recent_emotion_scores.length >= 3) {
      const last3 = recent_emotion_scores.slice(-3)
      hasNegativeTrajectory = last3.every((s: number) => s < -0.6)
    }

    if (safetyClass === 'moderate_risk' || hasNegativeTrajectory) {
      if (user_id && hasNegativeTrajectory) {
        await logCrisisEvent(user_id, entry_id, 'medium', null, ['negative_emotion_trajectory'])
      }
      return jsonResponse({
        safe:           true,
        risk_level:     'moderate',
        intervention:   MODERATE_INTERVENTION,
        show_resources: true,
      })
    }

    // 4. Safe — optionally note low_risk for future tracking
    return jsonResponse({ safe: true, risk_level: safetyClass === 'low_risk' ? 'low' : 'none' })
  } catch (err) {
    // Safety checks must never crash the main flow — fail open
    console.error('[safety-check] error:', err)
    return jsonResponse({ safe: true, risk_level: 'none', error: String(err) })
  }
})
