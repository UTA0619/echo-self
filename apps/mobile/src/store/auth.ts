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
          // Use `profiles` table — profiles.id == auth.users.id (no separate users table)
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, created_at, subscription_tier, onboarding_completed')
            .eq('id', userId)
            .maybeSingle();

          // Profile might not exist yet for brand-new Apple/Google sign-ins
          // Supabase trigger should auto-create it, but race condition is possible
          if (error && error.code !== 'PGRST116') {
            console.error('[auth] loadProfile error:', error);
          }

          // Fetch total entry count separately
          const { count: entryCount } = await supabase
            .from('entries')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);

          // Fetch auth user for email
          const { data: { user: authUser } } = await supabase.auth.getUser();

          const profile: User = {
            id: userId,
            email: authUser?.email,
            displayName: data?.display_name ?? undefined,
            avatarUrl: undefined,
            currentStreak: 0,
            longestStreak: 0,
            totalEntries: entryCount ?? 0,
            subscriptionTier: data?.subscription_tier === 'premium' ? 'premium' : 'free',
            createdAt: data?.created_at ?? new Date().toISOString(),
          };

          set({ user: profile, isAuthenticated: true });
        } catch (err) {
          console.error('[auth] loadProfile failed:', err);
          // Still mark as authenticated so the user isn't stuck on login screen
          set({ isAuthenticated: true });
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
    },
  ),
);
