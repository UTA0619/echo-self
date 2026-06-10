/**
 * generate-share-card — AI Identity Share Card Generator
 *
 * Generates a shareable SVG identity card for a user's Future Self simulation.
 * Returns SVG + a public Storage URL.
 *
 * Uses Claude Sonnet to generate unique, personality-aware SVG layouts.
 * Falls back to a static template if Claude is unavailable.
 *
 * POST /generate-share-card
 * Body: { simulationId: string }
 *
 * The card displays:
 *  - User's horizon label (1 month / 3 months / 1 year)
 *  - Narrative excerpt + trajectory score as a ring
 *  - ECHO branding
 */

import { getServiceClient } from '../_shared/supabase.ts'

const ANTHROPIC_API_KEY     = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
function err(msg: string, status: number): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ── Claude Sonnet SVG generation ──────────────────────────────────────────────

async function generateSvg(opts: {
  displayName: string
  horizonLabel: string
  narrativeExcerpt: string
  trajectoryScore: number
}): Promise<string> {
  const { displayName, horizonLabel, narrativeExcerpt, trajectoryScore } = opts
  const pct = Math.round(trajectoryScore)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system:     'You are an expert SVG designer. Output ONLY valid, self-contained SVG markup — no explanation, no markdown fences.',
      messages: [{
        role:    'user',
        content: `Generate a 1080x1080 SVG share card for ECHO, an AI journaling app.

Data:
- Name: ${displayName}
- Future horizon: ${horizonLabel}
- Narrative excerpt: "${narrativeExcerpt.slice(0, 120)}"
- Trajectory score: ${pct}/100

Design:
- Background: #0A0B0F (very dark blue-black)
- Accent: #7B6CF6 (indigo/violet)
- Warm highlight: #F6A26C (soft orange)
- ECHO wordmark top-left (white, font-weight 800, font-size 26, letter-spacing -1)
- Large centered trajectory ring (SVG circle progress, ${pct}% filled, accent color)
- ${pct} score number centered inside the ring (bold, large, white)
- Horizon label below the ring (${horizonLabel}, muted white, italic)
- Narrative excerpt as italic quote text below (wrap at 50 chars, muted white)
- Name bottom-right (small, warm orange)
- "echo-self.app" bottom-center (very muted)
- Premium, minimal, dark aesthetic — no clutter
- Self-contained SVG, no external resources
- viewBox="0 0 1080 1080"

Output ONLY the SVG.`,
      }],
    }),
  })

  if (!res.ok) throw new Error(`Claude error: ${res.status}`)
  const json = await res.json() as { content: Array<{ text: string }> }
  let svg = json.content?.[0]?.text ?? ''

  // Strip markdown fences if Claude wraps in code block
  svg = svg.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim()
  if (!svg.startsWith('<svg')) throw new Error('Not valid SVG')
  return svg
}

// ── Fallback static SVG ───────────────────────────────────────────────────────

function buildFallbackSvg(opts: {
  displayName: string
  horizonLabel: string
  narrativeExcerpt: string
  trajectoryScore: number
}): string {
  const { displayName, horizonLabel, narrativeExcerpt, trajectoryScore } = opts
  const pct   = Math.round(trajectoryScore)
  const r     = 140
  const circ  = 2 * Math.PI * r
  const dash  = (pct / 100) * circ

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7B6CF6"/>
      <stop offset="100%" stop-color="#F6A26C"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="#0A0B0F"/>
  <rect x="40" y="40" width="1000" height="1000" rx="48" fill="none" stroke="#7B6CF6" stroke-width="1" opacity="0.2"/>

  <!-- ECHO wordmark -->
  <text x="60" y="95" fill="white" font-size="26" font-family="system-ui,sans-serif" font-weight="800" letter-spacing="-1">ECHO</text>

  <!-- Trajectory ring -->
  <circle cx="540" cy="440" r="${r}" fill="none" stroke="#1E2030" stroke-width="18"/>
  <circle cx="540" cy="440" r="${r}" fill="none" stroke="url(#g)" stroke-width="18"
    stroke-dasharray="${dash.toFixed(1)} ${(circ - dash).toFixed(1)}"
    stroke-dashoffset="${(circ * 0.25).toFixed(1)}"
    stroke-linecap="round"/>

  <!-- Score text -->
  <text x="540" y="455" text-anchor="middle" fill="white" font-size="64" font-family="system-ui,sans-serif" font-weight="800">${pct}</text>
  <text x="540" y="495" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="16" font-family="system-ui,sans-serif">trajectory score</text>

  <!-- Horizon -->
  <text x="540" y="630" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="24" font-family="system-ui,sans-serif" font-style="italic">${horizonLabel}</text>

  <!-- Narrative excerpt -->
  <text x="540" y="700" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-size="20" font-family="system-ui,sans-serif" font-style="italic">"${narrativeExcerpt.slice(0, 80).replace(/"/g, '&quot;')}"</text>

  <!-- Name + branding -->
  <text x="1020" y="1040" text-anchor="end" fill="#F6A26C" font-size="18" font-family="system-ui,sans-serif">${displayName}</text>
  <text x="540" y="1040" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-size="16" font-family="system-ui,sans-serif">echo-self.app</text>
</svg>`
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Missing Authorization', 401)

  const supabase = getServiceClient()

  // Verify user
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (authErr || !user) return err('Unauthorized', 401)

  const { simulationId } = await req.json().catch(() => ({}))
  if (!simulationId) return err('simulationId required', 400)

  // Load simulation
  const { data: sim, error: simErr } = await supabase
    .from('future_self_simulations')
    .select('*')
    .eq('id', simulationId)
    .eq('user_id', user.id)
    .single()

  if (simErr || !sim) return err('Simulation not found', 404)

  // Load profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('auth_id', user.id)
    .maybeSingle()

  const displayName  = profile?.display_name ?? 'You'
  const horizonLabel = sim.horizon_months === 1 ? '1 month from now'
    : sim.horizon_months === 3 ? '3 months from now'
    : '1 year from now'

  // Generate SVG
  let svg: string
  try {
    svg = await generateSvg({
      displayName,
      horizonLabel,
      narrativeExcerpt: sim.narrative ?? '',
      trajectoryScore:  sim.trajectory_score ?? 50,
    })
  } catch (e) {
    console.warn('[share-card] Claude SVG failed, using fallback:', e)
    svg = buildFallbackSvg({
      displayName,
      horizonLabel,
      narrativeExcerpt: sim.narrative ?? '',
      trajectoryScore:  sim.trajectory_score ?? 50,
    })
  }

  // Upload to Storage
  const filename = `share-cards/${user.id}/${simulationId}.svg`
  const { error: uploadErr } = await supabase.storage
    .from('public-assets')
    .upload(filename, svg, { contentType: 'image/svg+xml', upsert: true })

  if (uploadErr) console.warn('[share-card] Storage upload failed:', uploadErr.message)

  const { data: publicUrlData } = supabase.storage.from('public-assets').getPublicUrl(filename)

  return ok({ svg, publicUrl: publicUrlData?.publicUrl ?? null, simulationId })
})
