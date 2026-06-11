import { corsHeaders, errorResponse, jsonResponse, verifyJwt, createServiceClient } from '../_shared/auth.ts';
import type { RealitySyncRequest, RealitySyncResponse, EidolonMood } from '../_shared/types.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  const caller = await verifyJwt(req);
  if (!caller) return errorResponse('UNAUTHORIZED', 'Invalid token', 401);

  let body: RealitySyncRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body');
  }

  const db = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  // Compute ATK bonus from steps (0→1.0 at 0 steps, 1.0→1.5 at 10k steps)
  const atkBonus = 1.0 + Math.min((body.steps ?? 0) / 10000, 1.0) * 0.5;

  // Compute HP modifier from sleep (7-9h optimal → 1.1, <5h → 0.9)
  const sleep = body.sleepHours ?? 7;
  const hpModifier =
    sleep >= 7 && sleep <= 9 ? 1.1 :
    sleep >= 5 ? 1.0 :
    0.9;

  // Compute Eidolon mood from HRV + emotion
  const eidolonMood = computeMood(body.hrvScore, body.emotion);

  // Compute world weather from emotion
  const worldWeather = computeWeather(body.emotion, body.emotionIntensity);

  const statBonuses = { atkBonus, hpModifier, eidolonMood };

  // Upsert reality sync record
  await db.from('reality_syncs').upsert({
    user_id: caller.userId,
    sync_date: today,
    steps: body.steps ?? 0,
    sleep_hours: body.sleepHours,
    hrv_score: body.hrvScore,
    active_cal: body.activeCal,
    atk_bonus: atkBonus,
    hp_modifier: hpModifier,
    eidolon_mood: eidolonMood,
  }, { onConflict: 'user_id,sync_date' });

  // Upsert emotion log if emotion provided
  if (body.emotion) {
    await db.from('emotion_logs').upsert({
      user_id: caller.userId,
      emotion: body.emotion,
      intensity: body.emotionIntensity ?? 5,
      date: today,
    }, { onConflict: 'user_id,date' });
  }

  // Update Eidolon mood
  await db
    .from('eidolons')
    .update({ current_mood: eidolonMood })
    .eq('user_id', caller.userId);

  const response: RealitySyncResponse = { statBonuses, worldWeather };
  return jsonResponse(response);
});

function computeMood(hrv?: number, emotion?: string): EidolonMood {
  if (emotion === 'anxious' || emotion === 'sad') return 'anxious';
  if (emotion === 'tired') return 'tired';
  if (emotion === 'excited' || emotion === 'energized') return 'excited';
  if (emotion === 'focused') return 'focused';
  if (hrv !== undefined) {
    if (hrv > 60) return 'calm';
    if (hrv > 40) return 'focused';
    return 'anxious';
  }
  return 'calm';
}

function computeWeather(
  emotion?: string,
  intensity?: number,
): RealitySyncResponse['worldWeather'] {
  const high = (intensity ?? 5) >= 7;
  if (emotion === 'anxious' || emotion === 'sad') return high ? 'storm' : 'fog';
  if (emotion === 'excited' || emotion === 'happy') return high ? 'aurora' : 'clear';
  if (emotion === 'tired') return 'fog';
  return 'clear';
}
