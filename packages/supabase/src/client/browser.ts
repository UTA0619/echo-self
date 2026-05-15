import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database.js'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Singleton Supabase browser client.
 * Safe to call in React components and client-side code.
 */
export function getSupabaseBrowserClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_* variants).'
    )
  }

  client = createBrowserClient<Database>(url, anonKey)
  return client
}
