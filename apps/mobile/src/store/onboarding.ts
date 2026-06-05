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

  // Identity profile fields (used by AI prompts)
  identityTags: string[];         // self-selected personality descriptors
  aspirations: string;            // free-text life aspiration
  streakCommitment: number;       // days/week they commit to reflecting (1–7)

  // Convenience alias (used in some UI)
  get name(): string;

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  setDisplayName: (name: string) => void;
  toggleEmotion: (emotion: EmotionType) => void;
  setGoals: (goals: string[]) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setIdentityTags: (tags: string[]) => void;
  setAspirations: (text: string) => void;
  setStreakCommitment: (days: number) => void;
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
  identityTags: [] as string[],
  aspirations: '',
  streakCommitment: 5,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Convenience alias so components can use `name` instead of `displayName`
      get name() { return get().displayName },

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

      setIdentityTags: (tags) => set({ identityTags: tags }),

      setAspirations: (text) => set({ aspirations: text }),

      setStreakCommitment: (days) => set({ streakCommitment: days }),

      complete: () => set({ isComplete: true }),

      reset: () => set(initialState),
    }),
    {
      name: 'echo-self-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
