// ECHO//SELF — Auth Store
import { create } from 'zustand'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.EXPO_PUBLIC_SUPABASE_URL     ?? ''
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface User {
  id: string
  email?: string
  displayName?: string
}

interface AuthState {
  user: User | null
  session: { access_token: string } | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setSession: (session: { access_token: string } | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user:      null,
  session:   null,
  isLoading: true,

  setUser:    (user)    => set({ user }),
  setSession: (session) => set({ session, isLoading: false }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
}))
