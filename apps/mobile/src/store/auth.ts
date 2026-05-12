import { create } from 'zustand'
import type { User } from '@echo-self/shared-types'
import { supabase } from '../services/supabase'

interface AuthState {
  user: User | null
  session: { access_token: string } | null
  isLoading: boolean
  isAuthenticated: boolean
  signInWithEmail: (email: string) => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  loadUser: async () => {
    set({ isLoading: true })
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single()
      set({ session, user: userData as User | null, isAuthenticated: true })
    }
    set({ isLoading: false })
  },

  signInWithEmail: async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'echo-self://auth/callback' },
    })
    if (error) throw error
  },

  signInWithApple: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: 'echo-self://auth/callback' },
    })
    if (error) throw error
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, isAuthenticated: false })
  },
}))
