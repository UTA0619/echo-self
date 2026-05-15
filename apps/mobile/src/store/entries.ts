import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Entry, EmotionAnalysis } from '@echo-self/shared-types';

export type StreamState = 'idle' | 'submitting' | 'streaming' | 'complete' | 'error';

interface EntriesState {
  entries: Entry[];
  todayEntry: Entry | null;
  streamState: StreamState;
  streamedEcho: string;
  detectedEmotion: EmotionAnalysis | null;
  errorMessage: string | null;

  // Actions
  loadEntries: () => Promise<void>;
  submitEntry: (content: string, userId: string) => Promise<void>;
  resetStream: () => void;
}

export const useEntriesStore = create<EntriesState>((set, get) => ({
  entries: [],
  todayEntry: null,
  streamState: 'idle',
  streamedEcho: '',
  detectedEmotion: null,
  errorMessage: null,

  loadEntries: async () => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) { console.error('loadEntries:', error); return; }

    const today = new Date().toISOString().split('T')[0];
    const todayEntry = data?.find(
      (e) => e.created_at.startsWith(today)
    ) ?? null;

    set({ entries: data ?? [], todayEntry });
  },

  submitEntry: async (content: string, userId: string) => {
    set({ streamState: 'submitting', streamedEcho: '', detectedEmotion: null, errorMessage: null });

    try {
      // 1. Insert entry to DB
      const { data: entry, error: insertError } = await supabase
        .from('entries')
        .insert({ user_id: userId, content, word_count: content.split(/\s+/).filter(Boolean).length })
        .select()
        .single();

      if (insertError || !entry) throw new Error(insertError?.message ?? 'Insert failed');

      // Optimistically add to list
      set((s) => ({ entries: [entry, ...s.entries], todayEntry: entry }));

      // 2. Subscribe to Realtime updates on this entry
      set({ streamState: 'streaming' });
      const channel = supabase
        .channel(`entry-${entry.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'entries', filter: `id=eq.${entry.id}` },
          (payload) => {
            const updated = payload.new as Entry;
            if (updated.ai_response) {
              set({ streamedEcho: updated.ai_response });
            }
            if (updated.emotion_data) {
              set({ detectedEmotion: updated.emotion_data as unknown as EmotionAnalysis });
            }
            if (updated.ai_response && updated.emotion_data) {
              set({ streamState: 'complete' });
              channel.unsubscribe();
              // Refresh entries list
              get().loadEntries();
            }
          }
        )
        .subscribe();

      // 3. Invoke echo-ai edge function (fire and forget — Realtime delivers result)
      supabase.functions.invoke('echo-ai', {
        body: { entryId: entry.id, userId, content },
      }).catch(console.error);

      // Timeout fallback after 30s
      setTimeout(() => {
        const { streamState } = get();
        if (streamState === 'streaming') {
          channel.unsubscribe();
          set({ streamState: 'error', errorMessage: 'Echo took too long. Please try again.' });
        }
      }, 30_000);

    } catch (err) {
      set({ streamState: 'error', errorMessage: (err as Error).message });
    }
  },

  resetStream: () => set({ streamState: 'idle', streamedEcho: '', detectedEmotion: null, errorMessage: null }),
}));
