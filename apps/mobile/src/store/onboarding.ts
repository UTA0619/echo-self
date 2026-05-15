import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmotionType } from '@echo-self/shared-types';

interface OnboardingState {
  isComplete: boolean;
  currentStep: number;
  displayName: string;
  selectedEmotions: EmotionType[];
  goals: string[];
  notificationsEnabled: boolean;

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  setDisplayName: (name: string) => void;
  toggleEmotion: (emotion: EmotionType) => void;
  setGoals: (goals: string[]) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  complete: () => void;
  reset: () => void;
}

const initialState = {
  isComplete: false,
  currentStep: 0,
  displayName: '',
  selectedEmotions: [] as EmotionType[],
  goals: [] as string[],
  notificationsEnabled: false,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),

      setDisplayName: (name) => set({ displayName: name }),

      toggleEmotion: (emotion) => {
        const { selectedEmotions } = get();
        const already = selectedEmotions.includes(emotion);
        if (already) {
          set({ selectedEmotions: selectedEmotions.filter((e) => e !== emotion) });
        } else if (selectedEmotions.length < 3) {
          set({ selectedEmotions: [...selectedEmotions, emotion] });
        }
      },

      setGoals: (goals) => set({ goals }),

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      complete: () => set({ isComplete: true }),

      reset: () => set(initialState),
    }),
    {
      name: 'echo-self-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
