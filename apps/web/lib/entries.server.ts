/**
 * Server-only entry fetchers.
 * Import these ONLY in Server Components, Server Actions, or API route handlers.
 * They use the server Supabase client (cookie-based auth).
 */
import { createClient } from '@/lib/supabase/server'
import type { Entry } from './entries'

export type { Entry }

/** Fetch the authenticated user's recent entries (server-side, SSR-safe). */
export async function fetchEntries(limit = 20): Promise<Entry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

/** Fetch today's entry for the authenticated user (server-side). */
export async function fetchTodayEntry(): Promise<Entry | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Returns the current user's UUID (which doubles as their profile ID).
 * profiles.id == auth.users.id — no separate users table needed.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Count today's entries for free-tier enforcement. */
export async function countTodayEntries(): Promise<number> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { count, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00`)

  if (error) return 0
  return count ?? 0
}
