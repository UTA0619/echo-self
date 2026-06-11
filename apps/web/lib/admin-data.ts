/**
 * Admin data-fetching helpers.
 * All functions use the service-role client and run server-side only.
 */
import { createAdminClient } from './supabase/admin'

export interface AdminKPIs {
  totalUsers: number
  usersToday: number
  usersThisWeek: number
  premiumUsers: number
  totalEntries: number
  entriesToday: number
  entriesThisWeek: number
  avgEntriesPerUser: number
  totalMemories: number
  crisisEventsTotal: number
  crisisEventsThisWeek: number
  pushTokensTotal: number
}

export interface RecentUser {
  id: string
  email: string | null
  display_name: string | null
  subscription_tier: string
  current_streak: number
  total_entries: number
  created_at: string
}

export interface RecentEntry {
  id: string
  user_id: string
  display_name: string | null
  content_preview: string
  emotion: string | null
  created_at: string
}

export interface CrisisEvent {
  id: string
  user_id: string
  display_name: string | null
  severity: string
  trigger_phrase: string | null
  created_at: string
  resolved: boolean
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

export async function fetchAdminKPIs(): Promise<AdminKPIs> {
  const supabase = createAdminClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    totalUsersRes,
    usersTodayRes,
    usersWeekRes,
    premiumRes,
    totalEntriesRes,
    entriesTodayRes,
    entriesWeekRes,
    memoriesRes,
    crisisTotalRes,
    crisisWeekRes,
    pushTokensRes,
  ] = await Promise.allSettled([
    supabase.from('users').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart).is('deleted_at', null),
    supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekStart).is('deleted_at', null),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'premium').is('deleted_at', null),
    supabase.from('entries').select('id', { count: 'exact', head: true }),
    supabase.from('entries').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('entries').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('memories').select('id', { count: 'exact', head: true }),
    supabase.from('crisis_events').select('id', { count: 'exact', head: true }),
    supabase.from('crisis_events').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('push_tokens').select('id', { count: 'exact', head: true }),
  ])

  const safe = (res: PromiseSettledResult<{ count: number | null; error: unknown }>) =>
    res.status === 'fulfilled' ? (res.value.count ?? 0) : 0

  const totalUsers   = safe(totalUsersRes as PromiseSettledResult<{ count: number | null; error: unknown }>)
  const totalEntries = safe(totalEntriesRes as PromiseSettledResult<{ count: number | null; error: unknown }>)

  return {
    totalUsers,
    usersToday:          safe(usersTodayRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    usersThisWeek:       safe(usersWeekRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    premiumUsers:        safe(premiumRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    totalEntries,
    entriesToday:        safe(entriesTodayRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    entriesThisWeek:     safe(entriesWeekRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    avgEntriesPerUser:   totalUsers > 0 ? Math.round((totalEntries / totalUsers) * 10) / 10 : 0,
    totalMemories:       safe(memoriesRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    crisisEventsTotal:   safe(crisisTotalRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    crisisEventsThisWeek: safe(crisisWeekRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
    pushTokensTotal:     safe(pushTokensRes as PromiseSettledResult<{ count: number | null; error: unknown }>),
  }
}

// ── Recent users ───────────────────────────────────────────────────────────────

export async function fetchRecentUsers(limit = 20): Promise<RecentUser[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, email, display_name, subscription_tier, current_streak, total_entries, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[admin] fetchRecentUsers error:', error)
    return []
  }

  return (data ?? []) as RecentUser[]
}

// ── Recent entries (redacted) ─────────────────────────────────────────────────

export async function fetchRecentEntries(limit = 15): Promise<RecentEntry[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('entries')
    .select(`
      id,
      user_id,
      content,
      emotion,
      created_at,
      users!inner ( display_name )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[admin] fetchRecentEntries error:', error)
    return []
  }

  // Supabase types embedded joins as arrays; the actual to-one shape is an
  // object|null, so cast through unknown to the real row shape.
  type EntryRow = {
    id: string
    user_id: string
    content: string
    emotion: string | null
    created_at: string
    users: { display_name: string | null } | null
  }
  return ((data ?? []) as unknown as EntryRow[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    display_name: row.users?.display_name ?? null,
    content_preview: (row.content ?? '').slice(0, 80) + ((row.content?.length ?? 0) > 80 ? '…' : ''),
    emotion: row.emotion ?? null,
    created_at: row.created_at,
  }))
}

// ── Crisis events ─────────────────────────────────────────────────────────────

export async function fetchRecentCrisisEvents(limit = 10): Promise<CrisisEvent[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('crisis_events')
    .select(`
      id,
      user_id,
      severity,
      trigger_phrase,
      created_at,
      resolved,
      users!inner ( display_name )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[admin] fetchRecentCrisisEvents error:', error)
    return []
  }

  type CrisisRow = {
    id: string
    user_id: string
    severity: string
    trigger_phrase: string | null
    created_at: string
    resolved: boolean
    users: { display_name: string | null } | null
  }
  return ((data ?? []) as unknown as CrisisRow[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    display_name: row.users?.display_name ?? null,
    severity: row.severity,
    trigger_phrase: row.trigger_phrase,
    created_at: row.created_at,
    resolved: row.resolved ?? false,
  }))
}
