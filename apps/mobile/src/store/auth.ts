import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

export interface User {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  subscriptionTier: 'free' | 'premium';
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  loadProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  incrementStreak: () => void;
  updateStreak: (streak: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: user !== null }),

      loadProfile: async (userId: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (error) throw error;

          if (data) {
            const user: User = {
              id: data.id,
              email: data.email,
              displayName: data.display_name,
              avatarUrl: data.avatar_url,
              currentStreak: data.current_streak ?? 0,
              longestStreak: data.longest_streak ?? 0,
              totalEntries: data.total_entries ?? 0,
              subscriptionTier: data.subscription_tier ?? 'free',
              createdAt: data.created_at,
            };
            set({ user, isAuthenticated: true });
          }
        } catch (err) {
          console.error('[auth] loadProfile failed:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      incrementStreak: () => {
        const { user } = get();
        if (!user) return;
        const newStreak = user.currentStreak + 1;
        set({
          user: {
            ...user,
            currentStreak: newStreak,
            longestStreak: Math.max(user.longestStreak, newStreak),
          },
        });
      },

      updateStreak: (streak: number) => {
        const { user } = get();
        if (!user) return;
        set({
          user: {
            ...user,
            currentStreak: streak,
            longestStreak: Math.max(user.longestStreak, streak),
          },
        });
      },
    }),
    {
      name: 'echo-self-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
