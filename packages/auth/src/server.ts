// ECHO//SELF — Server-side Auth helpers
// Use in Next.js Route Handlers and Server Components.

import { createSupabaseServerClient } from '@echoself/supabase'
import type { AuthUser } from './types.js'
import { UnauthenticatedError } from './types.js'

type CookieStore = Parameters<typeof createSupabaseServerClient>[0]

/**
 * Get the authenticated user from a server context.
 * Returns null if no active session.
 *
 * @example
 * // In a Route Handler:
 * const user = await getServerUser(await cookies())
 * if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
 */
export async function getServerUser(cookieStore: CookieStore): Promise<AuthUser | null> {
  const supabase = createSupabaseServerClient(cookieStore)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  // Fetch profile for display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, onboarding_completed')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    onboardingCompleted: profile?.onboarding_completed ?? false,
  }
}

/**
 * Assert the user is authenticated. Throws UnauthenticatedError otherwise.
 * Use in Route Handlers where unauthenticated access must be blocked.
 */
export async function requireServerUser(cookieStore: CookieStore): Promise<AuthUser> {
  const user = await getServerUser(cookieStore)
  if (!user) throw new UnauthenticatedError()
  return user
}

/**
 * Verify a raw Bearer token from an Authorization header.
 * Use in Supabase Edge Functions and API routes that receive JWTs directly.
 *
 * @example
 * const authHeader = req.headers.get('Authorization') // 'Bearer eyJ...'
 * const user = await verifyBearerToken(authHeader, supabase)
 */
export async function verifyBearerToken(
  authorizationHeader: string | null,
  supabase: ReturnType<typeof createSupabaseServerClient>
): Promise<AuthUser | null> {
  if (!authorizationHeader?.startsWith('Bearer ')) return null

  const token = authorizationHeader.slice(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, onboarding_completed')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    onboardingCompleted: profile?.onboarding_completed ?? false,
  }
}
