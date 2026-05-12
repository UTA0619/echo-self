import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import type { VisualArchetype } from '@echo-self/shared-types';

export interface FutureSelfPrediction {
  id: string;
  userId: string;
  personaName: string;
  description: string;
  keyTraitShifts: TraitShift[];
  confidenceScore: number;   // 0–1
  visualArchetype: VisualArchetype;
  timeHorizon: '30d' | '90d' | '1y';
  generatedAt: string;       // ISO
  entryCount: number;        // entries used for prediction
}

export interface TraitShift {
  trait: string;
  from: string;
  to: string;
  direction: 'growth' | 'healing' | 'transformation' | 'integration';
  magnitude: number; // 0–1
}

export type PredictionState = 'idle' | 'loading' | 'ready' | 'error';

interface FutureSelfState {
  prediction: FutureSelfPrediction | null;
  predictionState: PredictionState;
  isRevealed: boolean;         // dramatic reveal tracking
  errorMessage: string | null;

  loadPrediction: (userId: string) => Promise<void>;
  generatePrediction: (userId: string) => Promise<void>;
  setRevealed: (revealed: boolean) => void;
  reset: () => void;
}

export const useFutureSelfStore = create<FutureSelfState>()(
  persist(
    (set, get) => ({
      prediction: null,
      predictionState: 'idle',
      isRevealed: false,
      errorMessage: null,

      loadPrediction: async (userId: string) => {
        set({ predictionState: 'loading', errorMessage: null });
        const { data, error } = await supabase
          .from('future_self_predictions')
          .select('*')
          .eq('user_id', userId)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single();

        if (error || !data) {
          set({ predictionState: 'idle', prediction: null });
          return;
        }

        set({
          prediction: {
            id: data.id,
            userId: data.user_id,
            personaName: data.persona_name,
            description: data.description,
            keyTraitShifts: data.key_trait_shifts ?? [],
            confidenceScore: data.confidence_score ?? 0.5,
            visualArchetype: data.visual_archetype ?? 'explorer',
            timeHorizon: data.time_horizon ?? '30d',
            generatedAt: data.generated_at,
            entryCount: data.entry_count ?? 0,
          },
          predictionState: 'ready',
        });
      },

      generatePrediction: async (userId: string) => {
        set({ predictionState: 'loading', errorMessage: null });
        try {
          const { data, error } = await supabase.functions.invoke('generate-future-self', {
            body: { userId },
          });
          if (error) throw error;

          set({
            prediction: data,
            predictionState: 'ready',
            isRevealed: false, // trigger re-reveal for new prediction
          });
        } catch (err) {
          set({
            predictionState: 'error',
            errorMessage: (err as Error).message,
          });
        }
      },

      setRevealed: (revealed) => set({ isRevealed: revealed }),
      reset: () => set({ prediction: null, predictionState: 'idle', isRevealed: false }),
    }),
    {
      name: 'echo-future-self',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ prediction: s.prediction, isRevealed: s.isRevealed }),
    }
  )
);
