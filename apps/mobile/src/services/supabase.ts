// ECHO//SELF — Supabase client singleton for mobile app
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL      ?? ''
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true },
})
