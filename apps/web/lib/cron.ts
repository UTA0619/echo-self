// ECHO//SELF — Cron helpers
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` on each scheduled hit.
// These routes are thin, authenticated proxies that invoke the corresponding
// Supabase edge function (which self-selects the users to process).

import { NextResponse } from 'next/server'

/** Verify a request came from Vercel Cron (or an authorized caller). */
export function verifyCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Fail closed: without a configured secret we cannot authenticate the caller.
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/** Invoke a Supabase edge function with the service-role key. */
export async function invokeEdgeFunction(
  name: string,
  payload: Record<string, unknown> = {},
): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Supabase URL or service role key not configured' },
      { status: 500 },
    )
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    if (!res.ok) {
      console.error(`[cron:${name}] edge function failed`, res.status, text)
      return NextResponse.json({ error: `${name} failed`, status: res.status }, { status: 502 })
    }
    return NextResponse.json({ ok: true, function: name, result: safeJson(text) })
  } catch (err) {
    console.error(`[cron:${name}] invocation error`, err)
    return NextResponse.json({ error: `Could not invoke ${name}` }, { status: 502 })
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
