/**
 * ai-push-notifications — Personalized AI-driven push notifications
 *
 * Cron endpoint (runs daily at 09:00 UTC). For each active user who
 * hasn't journaled today, it:
 *  1. Loads their recent emotion arc (last 7 days of journal_entries)
 *  2. Generates a personalized, empathetic notification body via GPT-4o-mini
 *  3. Sends via Expo Push API
 *
 * The notification body references the user's emotional patterns to feel
 * personal rather than generic ("You've been feeling anticipation lately…").
 *
 * Invoked by Supabase cron scheduler or GitHub Actions scheduled workflow.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY           = Deno.env.get('OPENAI_API_KEY')!;
const EXPO_PUSH_URL            = 'https://exp.host/--/api/v2/push/send';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface UserWithContext {
  userId: string;
  displayName: string;
  pushTokens: string[];
  recentEmotions: string[];
  streakCount: number;
  lastEmotionSummary: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify internal cron secret
  const secret = req.headers.get('x-cron-secret');
  if (secret !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('[ai-push] Starting personalized notification run…');

  const today = new Date().toISOString().slice(0, 10);

  // ── 1. Find users who haven't journaled today and have push tokens ────────
  const { data: candidates, error: candidatesErr } = await supabase
    .from('users')
    .select(`
      id,
      display_name,
      current_streak,
      notifications!inner (
        expo_push_token
      )
    `)
    .eq('notifications.enabled', true)
    .not('id', 'in',
      supabase
        .from('journal_entries')
        .select('user_id')
        .gte('created_at', `${today}T00:00:00Z`)
        .lte('created_at', `${today}T23:59:59Z`)
    );

  if (candidatesErr) {
    console.error('[ai-push] candidates query error:', candidatesErr.message);
    return new Response(JSON.stringify({ error: candidatesErr.message }), { status: 500 });
  }

  if (!candidates?.length) {
    console.log('[ai-push] No eligible users — all have journaled today.');
    return new Response(JSON.stringify({ sent: 0 }));
  }

  console.log(`[ai-push] ${candidates.length} users eligible`);

  // ── 2. Build emotion context for each user ────────────────────────────────
  const usersWithContext: UserWithContext[] = await Promise.all(
    candidates.map(async (row: any) => {
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('emotion_analysis')
        .eq('user_id', row.id)
        .not('emotion_analysis', 'is', null)
        .order('created_at', { ascending: false })
        .limit(7);

      const emotions = (entries ?? [])
        .map((e: any) => e.emotion_analysis?.emotion)
        .filter(Boolean) as string[];

      // Summarise the arc for the prompt
      const emotionFreq: Record<string, number> = {};
      for (const e of emotions) emotionFreq[e] = (emotionFreq[e] ?? 0) + 1;
      const topEmotions = Object.entries(emotionFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emotion]) => emotion);

      const summary = topEmotions.length > 0
        ? `User has been feeling ${topEmotions.join(', ')} over the past week.`
        : 'No recent emotion data.';

      const tokens = (row.notifications ?? []).map((n: any) => n.expo_push_token);

      return {
        userId: row.id,
        displayName: row.display_name ?? 'there',
        pushTokens: tokens,
        recentEmotions: topEmotions,
        streakCount: row.current_streak ?? 0,
        lastEmotionSummary: summary,
      };
    })
  );

  // ── 3. Generate personalized messages via GPT-4o-mini ────────────────────
  const messages = await Promise.all(
    usersWithContext.map(async (user) => {
      const streakHint = user.streakCount > 0
        ? `The user has a ${user.streakCount}-day streak they'll lose if they don't journal today.`
        : 'The user has no active streak.';

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 80,
          temperature: 0.85,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You write short, warm, non-judgmental push notification copy for a journaling app called ECHO//SELF.
The app helps users understand their emotions and future self through AI.
Write a title (max 40 chars) and body (max 90 chars) that feels personal and empathetic.
Never be preachy. Reference the user's emotional patterns naturally.
Output JSON: {"title": "...", "body": "..."}`,
            },
            {
              role: 'user',
              content: `User: ${user.displayName}\n${user.lastEmotionSummary}\n${streakHint}\nGenerate a personalized notification.`,
            },
          ],
        });

        const raw = completion.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw);
        return {
          user,
          title: parsed.title ?? 'Your reflection is waiting ✨',
          body: parsed.body ?? 'Take a moment to check in with yourself today.',
        };
      } catch (err) {
        console.error(`[ai-push] OpenAI error for user ${user.userId}:`, err);
        // Fallback copy
        return {
          user,
          title: user.streakCount > 1 ? `${user.streakCount}-day streak 🔥` : 'Your echo is waiting ✨',
          body: 'Take a moment to reflect — your future self will thank you.',
        };
      }
    })
  );

  // ── 4. Send to Expo Push API in batches of 100 ───────────────────────────
  const pushPayloads = messages.flatMap(({ user, title, body }) =>
    user.pushTokens.map((token) => ({
      to: token,
      title,
      body,
      data: { screen: 'Mirror' },
      sound: 'default',
      badge: 1,
      priority: 'normal',
    }))
  );

  const BATCH_SIZE = 100;
  let totalSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < pushPayloads.length; i += BATCH_SIZE) {
    const batch = pushPayloads.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      const result = await res.json();
      const batchErrors = result.data?.filter((r: any) => r.status === 'error') ?? [];
      totalSent += batch.length - batchErrors.length;
      totalFailed += batchErrors.length;
      if (batchErrors.length > 0) {
        console.warn(`[ai-push] ${batchErrors.length} failed in batch ${i / BATCH_SIZE + 1}`);
      }
    } catch (err) {
      console.error(`[ai-push] Expo batch ${i / BATCH_SIZE + 1} failed:`, err);
      totalFailed += batch.length;
    }
  }

  console.log(`[ai-push] Complete. sent=${totalSent} failed=${totalFailed}`);
  return new Response(
    JSON.stringify({ sent: totalSent, failed: totalFailed, users: usersWithContext.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
