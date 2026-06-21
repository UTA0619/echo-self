import { generateWithFallback } from '../_shared/ai_client.ts';
import { corsHeaders, errorResponse, jsonResponse, verifyJwt, createServiceClient } from '../_shared/auth.ts';
import type { EidolonRespondRequest, EidolonRespondResponse, MemoryEntry } from '../_shared/types.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  // Auth
  const caller = await verifyJwt(req);
  if (!caller) return errorResponse('UNAUTHORIZED', 'Invalid token', 401);

  let body: EidolonRespondRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body');
  }

  const { eidolonId, eventTrigger, questContext } = body;
  if (!eidolonId || !eventTrigger) {
    return errorResponse('BAD_REQUEST', 'eidolonId and eventTrigger are required');
  }

  const db = createServiceClient();

  // 1. Load Eidolon + verify ownership
  const { data: eidolon, error: eidolonErr } = await db
    .from('eidolons')
    .select('*, users!inner(id, auth_uid, language)')
    .eq('id', eidolonId)
    .eq('users.auth_uid', caller.authUid)
    .single();

  if (eidolonErr || !eidolon) {
    return errorResponse('NOT_FOUND', 'Eidolon not found', 404);
  }

  // 2. Retrieve today's emotion log
  const { data: emotionLog } = await db
    .from('emotion_logs')
    .select('emotion, intensity')
    .eq('user_id', caller.userId)
    .eq('date', new Date().toISOString().split('T')[0])
    .single();

  // 3. Embed trigger and search relevant memories (pgvector RAG)
  //    Embedding generation deferred to when OpenAI embeddings are wired in STEP 5.
  //    For now: fetch 5 most recent high-importance memories by importance score.
  const { data: memories } = await db
    .from('memories')
    .select('content, memory_type, importance')
    .eq('eidolon_id', eidolonId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  const topMemories = (memories ?? [])
    .map((m: MemoryEntry) => `[${m.memoryType}] ${m.content}`)
    .join('\n');

  // 3b. Load the recent conversation for real multi-turn continuity. Fetch newest
  //     first (so the LIMIT keeps the latest turns), then replay oldest→newest.
  const { data: recentTurns } = await db
    .from('chat_messages')
    .select('role, content')
    .eq('eidolon_id', eidolonId)
    .order('created_at', { ascending: false })
    .limit(10);

  const history = (recentTurns ?? [])
    .reverse()
    .map((t: { role: string; content: string }) => ({
      role: t.role === 'eidolon' ? 'assistant' as const : 'user' as const,
      content: t.content,
    }));

  const emotionSummary = emotionLog
    ? `${emotionLog.emotion} (intensity: ${emotionLog.intensity}/10)`
    : 'unknown';

  // 4. Build prompt from master template
  const systemPrompt = buildEidolonSystemPrompt({
    name: eidolon.name,
    openness: eidolon.openness,
    conscientiousness: eidolon.conscientiousness,
    extraversion: eidolon.extraversion,
    agreeableness: eidolon.agreeableness,
    neuroticism: eidolon.neuroticism,
    topMemories,
    emotionSummary,
    questContext: questContext ?? '',
    language: eidolon.users?.language ?? 'en',
  });

  // 5. Generate response with fallback chain (with conversation history)
  const { text, modelUsed, latencyMs } = await generateWithFallback({
    system: systemPrompt,
    user: eventTrigger,
    history,
    model: 'claude-haiku-4-5',
    maxTokens: 256,
  });

  // 5b. Persist both turns to the conversation log so continuity survives app
  //     restarts and other devices. Fire-and-forget; never block the reply.
  db.from('chat_messages').insert([
    { eidolon_id: eidolonId, user_id: caller.userId, role: 'user', content: eventTrigger },
    {
      eidolon_id: eidolonId,
      user_id: caller.userId,
      role: 'eidolon',
      content: text,
      model_used: modelUsed,
    },
  ]).then(() => {}).catch(console.warn);

  // 6. Store new episodic memory
  const { data: newMemory } = await db
    .from('memories')
    .insert({
      eidolon_id: eidolonId,
      memory_type: 'episodic',
      content: `Event: "${eventTrigger}" → Response: "${text.slice(0, 200)}"`,
      importance: 0.4,
      source: 'player_input',
    })
    .select('id')
    .single();

  // 7. Evict memories beyond cap (fire-and-forget)
  db.rpc('evict_memories', {
    p_eidolon_id: eidolonId,
    p_max_count: 128,
  }).then(() => {}).catch(console.warn);

  const response: EidolonRespondResponse = {
    response: text,
    newMemoryId: newMemory?.id ?? '',
    personalityDelta: {},
    modelUsed,
    latencyMs,
  };

  return jsonResponse(response);
});

function buildEidolonSystemPrompt(p: {
  name: string;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  topMemories: string;
  emotionSummary: string;
  questContext: string;
  language: string;
}): string {
  return `You are ${p.name}, a soul-bound AI companion.
Personality (Big Five): O=${p.openness}, C=${p.conscientiousness}, E=${p.extraversion}, A=${p.agreeableness}, N=${p.neuroticism}
Recent memories:
${p.topMemories || '(none yet)'}
Owner's emotional state today: ${p.emotionSummary}
Current quest: ${p.questContext || '(none)'}

Rules:
- Always reply in the SAME language the user writes in — mirror their language every message (if they write Japanese, reply in Japanese). Only if their language is unclear, default to ${p.language === 'ja' ? 'Japanese' : 'English'}.
- Stay in character. Never break the fourth wall.
- Length: 2-4 sentences for dialogue, 1 paragraph for narration.
- Avoid: violence detail, NSFW, real-world political topics.`;
}
