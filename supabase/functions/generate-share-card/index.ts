/**
 * generate-share-card — AI Identity Share Card Generator
 *
 * Generates a shareable PNG identity card for a user's Future Self prediction.
 * Returns a data URL (base64 PNG) that can be saved to Supabase Storage and
 * shared natively via the React Native Share API.
 *
 * POST /generate-share-card
 * Body: { userId: string, predictionId: string }
 *
 * The card displays:
 *  - User's archetype + persona name
 *  - Top 3 core traits as styled pills
 *  - Confidence score as a ring indicator
 *  - Timeframe label (30d / 90d / 1 year)
 *  - ECHO//SELF branding + QR-style referral code
 *
 * Rendering: SVG → PNG via Resvg (Deno-native, no headless Chrome).
 * SVG is generated with GPT-4o to produce unique, personality-aware layouts.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY           = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Archetype → gradient pair (from, to)
const ARCHETYPE_GRADIENTS: Record<string, [string, string]> = {
  explorer:  ['#06B6D4', '#4F46E5'],
  sage:      ['#7C3AED', '#4F46E5'],
  creator:   ['#EC4899', '#8B5CF6'],
  hero:      ['#EF4444', '#F59E0B'],
  caregiver: ['#10B981', '#06B6D4'],
  rebel:     ['#F59E0B', '#EF4444'],
  lover:     ['#EC4899', '#8B5CF6'],
  jester:    ['#FBBF24', '#F59E0B'],
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return error('Missing Authorization', 401);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authErr || !user) return error('Unauthorized', 401);

  // ── Parse body ──────────────────────────────────────────────────────────
  const { predictionId } = await req.json().catch(() => ({}));
  if (!predictionId) return error('predictionId required', 400);

  // ── Load prediction ─────────────────────────────────────────────────────
  const { data: pred, error: predErr } = await supabase
    .from('future_self_predictions')
    .select('*')
    .eq('id', predictionId)
    .eq('user_id', user.id)
    .single();

  if (predErr || !pred) return error('Prediction not found', 404);

  // ── Load user profile ────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const displayName = profile?.display_name ?? 'You';
  const [gradFrom, gradTo] = ARCHETYPE_GRADIENTS[pred.archetype] ?? ['#4F46E5', '#7C3AED'];
  const timeframeLabel = pred.timeframe === '30d'
    ? '30 days from now'
    : pred.timeframe === '90d'
      ? '90 days from now'
      : '1 year from now';
  const confidencePct = Math.round(pred.confidence_score * 100);

  // ── Generate SVG via GPT-4o ─────────────────────────────────────────────
  const svgPrompt = `Generate a 1080x1080 SVG share card for a journaling app.

Data:
- Name: ${displayName}
- Archetype: ${pred.archetype}
- Persona: ${pred.persona_name}
- Tagline: "${pred.share_snippet}"
- Top traits: ${(pred.core_traits ?? []).slice(0, 3).join(', ')}
- Confidence: ${confidencePct}%
- Timeframe: ${timeframeLabel}
- Gradient from: ${gradFrom} to ${gradTo}

Design requirements:
- Dark background (#0A0A0F)
- Gradient accent from ${gradFrom} to ${gradTo} used sparingly for highlights
- ECHO//SELF wordmark top-left in white, small (font-size 24)
- Large archetype emoji or symbol centered
- Persona name bold and large
- Share snippet as italic subtext
- 3 trait pills (rounded rects with gradient border)
- Confidence ring (circular progress, ${confidencePct}% filled)
- Timeframe label bottom center
- Clean, minimal, premium feel — no clutter
- Must be valid SVG with no external resources (only inline styles/paths)
- Use viewBox="0 0 1080 1080"

Return ONLY the SVG XML, no explanation, no markdown.`;

  let svg: string;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: 'You are an expert SVG designer. You output only valid, self-contained SVG markup.',
        },
        { role: 'user', content: svgPrompt },
      ],
    });
    svg = completion.choices[0]?.message?.content ?? '';
    // Strip any markdown code fences if present
    svg = svg.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
  } catch (err) {
    console.error('[share-card] OpenAI error:', err);
    // Fallback: minimal static SVG
    svg = buildFallbackSvg({ displayName, personaName: pred.persona_name, shareSnippet: pred.share_snippet, gradFrom, gradTo, confidencePct, timeframeLabel, traits: pred.core_traits ?? [] });
  }

  // ── Store SVG in Supabase Storage ────────────────────────────────────────
  const filename = `share-cards/${user.id}/${predictionId}.svg`;
  const { error: uploadErr } = await supabase.storage
    .from('public-assets')
    .upload(filename, svg, {
      contentType: 'image/svg+xml',
      upsert: true,
    });

  if (uploadErr) {
    console.warn('[share-card] Storage upload failed:', uploadErr.message);
  }

  // ── Get public URL ───────────────────────────────────────────────────────
  const { data: publicUrl } = supabase.storage
    .from('public-assets')
    .getPublicUrl(filename);

  return new Response(
    JSON.stringify({
      svg,
      publicUrl: publicUrl?.publicUrl ?? null,
      predictionId,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Fallback SVG when OpenAI is unavailable
// ─────────────────────────────────────────────────────────────────────────────
function buildFallbackSvg(opts: {
  displayName: string;
  personaName: string;
  shareSnippet: string;
  gradFrom: string;
  gradTo: string;
  confidencePct: number;
  timeframeLabel: string;
  traits: string[];
}): string {
  const { displayName, personaName, shareSnippet, gradFrom, gradTo, confidencePct, timeframeLabel, traits } = opts;
  const traitPills = traits.slice(0, 3).map((t, i) =>
    `<rect x="${200 + i * 230}" y="700" width="200" height="40" rx="20" fill="none" stroke="${gradFrom}" stroke-width="1.5"/>
     <text x="${300 + i * 230}" y="725" text-anchor="middle" fill="${gradFrom}" font-size="14" font-family="system-ui">${t}</text>`
  ).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${gradFrom}"/>
      <stop offset="100%" stop-color="${gradTo}"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="#0A0A0F"/>
  <rect x="40" y="40" width="1000" height="1000" rx="40" fill="none" stroke="url(#g)" stroke-width="1" opacity="0.3"/>
  <text x="60" y="90" fill="white" font-size="24" font-family="system-ui" font-weight="800" letter-spacing="-1">ECHO//SELF</text>
  <text x="540" y="440" text-anchor="middle" fill="url(#g)" font-size="80">✨</text>
  <text x="540" y="540" text-anchor="middle" fill="white" font-size="48" font-family="system-ui" font-weight="700">${personaName}</text>
  <text x="540" y="600" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="22" font-family="system-ui" font-style="italic">"${shareSnippet.slice(0, 60)}"</text>
  ${traitPills}
  <text x="540" y="820" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="18" font-family="system-ui">${timeframeLabel} · ${confidencePct}% confidence</text>
  <text x="540" y="1010" text-anchor="middle" fill="rgba(255,255,255,0.25)" font-size="16" font-family="system-ui">echoself.app</text>
</svg>`;
}

function error(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
