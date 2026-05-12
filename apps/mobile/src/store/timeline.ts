import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { Entry, EmotionType } from '@echo-self/shared-types';

export interface DayData {
  date: string;          // 'YYYY-MM-DD'
  entries: Entry[];
  dominantEmotion: EmotionType | null;
  avgIntensity: number;  // 0–1
  wordCount: number;
}

export interface ArcPoint {
  date: string;
  emotion: EmotionType | null;
  intensity: number;
  wordCount: number;
}

interface TimelineState {
  entries: Entry[];
  dayMap: Record<string, DayData>;
  arcPoints: ArcPoint[];
  searchQuery: string;
  searchResults: Entry[];
  isLoading: boolean;
  isSearching: boolean;

  loadTimeline: (days?: number) => Promise<void>;
  searchMemories: (query: string, userId: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  clearSearch: () => void;
}

function buildDayMap(entries: Entry[]): Record<string, DayData> {
  const map: Record<string, DayData> = {};
  for (const entry of entries) {
    const date = entry.created_at.slice(0, 10);
    if (!map[date]) {
      map[date] = { date, entries: [], dominantEmotion: null, avgIntensity: 0, wordCount: 0 };
    }
    map[date].entries.push(entry);
    map[date].wordCount += entry.word_count ?? 0;
    if (entry.emotion_data) {
      const em = entry.emotion_data as { emotion: EmotionType; intensity: number };
      map[date].dominantEmotion = em.emotion;
      map[date].avgIntensity = em.intensity;
    }
  }
  return map;
}

function buildArcPoints(entries: Entry[]): ArcPoint[] {
  return entries
    .filter((e) => !!e.emotion_data)
    .map((e) => {
      const em = e.emotion_data as { emotion: EmotionType; intensity: number };
      return {
        date: e.created_at.slice(0, 10),
        emotion: em?.emotion ?? null,
        intensity: em?.intensity ?? 0,
        wordCount: e.word_count ?? 0,
      };
    })
    .reverse(); // oldest first for chart
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  entries: [],
  dayMap: {},
  arcPoints: [],
  searchQuery: '',
  searchResults: [],
  isLoading: false,
  isSearching: false,

  loadTimeline: async (days = 30) => {
    set({ isLoading: true });
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) { console.error('loadTimeline:', error); set({ isLoading: false }); return; }

    const entries = data ?? [];
    set({
      entries,
      dayMap: buildDayMap(entries),
      arcPoints: buildArcPoints(entries),
      isLoading: false,
    });
  },

  searchMemories: async (query: string, userId: string) => {
    if (!query.trim()) { set({ searchResults: [] }); return; }
    set({ isSearching: true });
    try {
      // Use edge function for vector similarity search
      const { data, error } = await supabase.functions.invoke('memory-retrieve', {
        body: { query, userId, limit: 10 },
      });
      if (error) throw error;
      set({ searchResults: data?.entries ?? [] });
    } catch {
      // Fallback: text search
      const { data } = await supabase
        .from('entries')
        .select('*')
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      set({ searchResults: data ?? [] });
    } finally {
      set({ isSearching: false });
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  clearSearch: () => set({ searchQuery: '', searchResults: [] }),
}));
