import { generateWithFallback } from '../_shared/ai_client.ts';
import { corsHeaders, errorResponse, jsonResponse, verifyJwt, createServiceClient } from '../_shared/auth.ts';
import type { DungeonGenerateRequest, DungeonGenerateResponse, DungeonTheme } from '../_shared/types.ts';

const THEME_FLAVORS: Record<DungeonTheme, string> = {
  forest:       'An ancient forest filled with glowing fungi and forgotten shrines.',
  cave:         'A network of caverns humming with crystal resonance.',
  ruins:        'The crumbling remains of a civilization lost to time.',
  void:         'A dimension between dimensions — logic bends here.',
  ocean_depth:  'The sunken corridors of a drowned palace.',
  sky_citadel:  'Floating platforms connected by chains above the clouds.',
  shadow_realm: 'A mirror world where light acts as poison.',
  crystal_maze: 'Shifting walls of pure prism that reflect the soul.',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  const caller = await verifyJwt(req);
  if (!caller) return errorResponse('UNAUTHORIZED', 'Invalid token', 401);

  let body: DungeonGenerateRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body');
  }

  const { eidolonId, difficulty = 1, theme } = body;
  if (!eidolonId) return errorResponse('BAD_REQUEST', 'eidolonId is required');

  const db = createServiceClient();

  // Verify eidolon ownership
  const { data: eidolon } = await db
    .from('eidolons')
    .select('id, name, level, openness, users!inner(auth_uid)')
    .eq('id', eidolonId)
    .eq('users.auth_uid', caller.authUid)
    .single();

  if (!eidolon) return errorResponse('NOT_FOUND', 'Eidolon not found', 404);

  // Select theme (bias toward exploration if openness is high)
  const themes = Object.keys(THEME_FLAVORS) as DungeonTheme[];
  const selectedTheme: DungeonTheme =
    theme ?? themes[Math.floor(Math.random() * themes.length)];
  const themeFlavor = THEME_FLAVORS[selectedTheme];
  const roomCount = 5 + Math.floor(difficulty * 1.5); // 5–20 rooms

  const systemPrompt = `You are a dungeon master generating a JSON dungeon for a soul-bound RPG.
Eidolon name: ${eidolon.name}, Level: ${eidolon.level}
Theme: ${selectedTheme} — ${themeFlavor}
Difficulty: ${difficulty}/10
Room count: ${roomCount}

Return ONLY valid JSON in this exact schema:
{
  "name": "string (evocative dungeon name)",
  "narrativeIntro": "string (2-3 sentence intro for the player)",
  "rooms": [
    {
      "index": 0,
      "description": "string (1-2 sentences)",
      "eventType": "combat|treasure|rest|story|boss",
      "eventData": {}
    }
  ],
  "bossConfig": {
    "name": "string",
    "description": "string",
    "hp": number,
    "atk": number,
    "specialAbility": "string"
  }
}

Rules: last room must be eventType "boss". No markdown. No extra text.`;

  const { text, modelUsed, latencyMs } = await generateWithFallback({
    system: systemPrompt,
    user: `Generate a level-${difficulty} ${selectedTheme} dungeon for ${eidolon.name}.`,
    model: 'claude-haiku-4-5',
    maxTokens: 2048,
  });

  // Parse AI output
  let parsed: { name: string; narrativeIntro: string; rooms: unknown[]; bossConfig: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    // Fallback if AI returns malformed JSON
    parsed = buildFallbackDungeon(selectedTheme, difficulty, roomCount);
  }

  // Persist to DB
  const { data: dungeon } = await db
    .from('dungeons')
    .insert({
      theme: selectedTheme,
      difficulty,
      name: parsed.name,
      narrative_intro: parsed.narrativeIntro,
      layout: parsed.rooms,
      boss_config: parsed.bossConfig ?? {},
      ai_model: modelUsed,
      generation_ms: latencyMs,
    })
    .select('id')
    .single();

  const response: DungeonGenerateResponse = {
    dungeonId: dungeon?.id ?? crypto.randomUUID(),
    name: parsed.name,
    narrativeIntro: parsed.narrativeIntro,
    rooms: parsed.rooms as DungeonGenerateResponse['rooms'],
    bossConfig: parsed.bossConfig as Record<string, unknown>,
    modelUsed,
    generationMs: latencyMs,
  };

  return jsonResponse(response);
});

function buildFallbackDungeon(theme: DungeonTheme, difficulty: number, roomCount: number) {
  const rooms = Array.from({ length: roomCount }, (_, i) => ({
    index: i,
    description: `A chamber of the ${theme}.`,
    eventType: i === roomCount - 1 ? 'boss' : (i % 3 === 0 ? 'treasure' : 'combat'),
    eventData: {},
  }));
  return {
    name: `The ${theme.replace('_', ' ')} of Shadows`,
    narrativeIntro: 'Darkness surrounds you. Your Eidolon stands ready.',
    rooms,
    bossConfig: { name: 'Shadow Guardian', description: 'An ancient guardian.', hp: difficulty * 50, atk: difficulty * 5, specialAbility: 'Shadow Strike' },
  };
}
