import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmotionType } from '@echo-self/shared-types';

export interface OnboardingData {
  name: string;
  emotions: EmotionType[];
  notificationsEnabled: boolean;
}

interface OnboardingState {
  step: number;
  name: string;
  selectedEmotions: EmotionType[];
  notificationsEnabled: boolean;
  isComplete: boolean;

  // Actions
  setName: (name: string) => void;
  toggleEmotion: (emotion: EmotionType) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeOnboarding: () => OnboardingData;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      step: 0,
      name: '',
      selectedEmotions: [],
      notificationsEnabled: false,
      isComplete: false,

      setName: (name) => set({ name }),

      toggleEmotion: (emotion) => {
        const current = get().selectedEmotions;
        if (current.includes(emotion)) {
          set({ selectedEmotions: current.filter((e) => e !== emotion) });
        } else if (current.length < 3) {
          set({ selectedEmotions: [...current, emotion] });
        }
      },

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 4) })),
      prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),

      completeOnboarding: () => {
        const { name, selectedEmotions, notificationsEnabled } = get();
        set({ isComplete: true });
        return { name, emotions: selectedEmotions, notificationsEnabled };
      },

      resetOnboarding: () =>
        set({ step: 0, name: '', selectedEmotions: [], notificationsEnabled: false, isComplete: false }),
    }),
    {
      name: 'echo-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
