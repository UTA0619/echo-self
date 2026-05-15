import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '../types/database.js'

type CookieStore = {
  get(name: string): string | undefined
  set(name: string, value: string, options: CookieOptions): void
  delete(name: string, options: CookieOptions): void
}

/**
 * Supabase server client for Next.js Route Handlers and Server Components.
 * Pass the Next.js `cookies()` store.
 *
 * @example
 * import { cookies } from 'next/headers'
 * const supabase = createSupabaseServerClient(await cookies())
 */
export function createSupabaseServerClient(cookieStore: CookieStore) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        // next/headers cookies() API — returns all cookies as array
        return (cookieStore as unknown as { getAll(): { name: string; value: string }[] }).getAll?.() ?? []
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // setAll is called in a Server Component — safe to ignore
        }
      },
    },
  })
}

/**
 * Supabase admin client using the service role key.
 * Only use in server-side code (API routes, edge functions).
 * NEVER expose to the client.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  // Import at runtime to avoid bundling in client code
  const { createClient } = require('@supabase/supabase-js')
  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
