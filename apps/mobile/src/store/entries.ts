import { create } from 'zustand'
import type { Entry, EmotionType } from '@echo-self/shared-types'
import { supabase } from '../services/supabase'
import { useAuthStore } from './auth'

interface EntryDraft {
  content: string
  emotion: EmotionType | null
  savedAt: number
}

interface EntriesState {
  entries: Entry[]
  draft: EntryDraft | null
  isSubmitting: boolean
  isLoading: boolean
  echoResponse: string
  isStreaming: boolean
  loadEntries: () => Promise<void>
  saveDraft: (content: string, emotion: EmotionType | null) => void
  submitEntry: (content: string, emotion: EmotionType | null) => Promise<void>
  rateEcho: (entryId: string, rating: -1 | 1) => Promise<void>
}

export const useEntriesStore = create<EntriesState>((set, get) => ({
  entries: [],
  draft: null,
  isSubmitting: false,
  isLoading: false,
  echoResponse: '',
  isStreaming: false,

  loadEntries: async () => {
    set({ isLoading: true })
    const user = useAuthStore.getState().user
    if (!user) return
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    set({ entries: (data as Entry[]) ?? [], isLoading: false })
  },

  saveDraft: (content, emotion) => {
    set({ draft: { content, emotion, savedAt: Date.now() } })
  },

  submitEntry: async (content, emotion) => {
    set({ isSubmitting: true, echoResponse: '', isStreaming: true })
    const { session, user } = useAuthStore.getState()
    if (!session || !user) throw new Error('Not authenticated')

    // Insert entry
    const { data: entry, error } = await supabase
      .from('entries')
      .insert({ user_id: user.id, content, emotion })
      .select()
      .single()
    if (error || !entry) throw error

    // Subscribe to echo response via Realtime
    const channel = supabase
      .channel(`echo:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'entries',
        filter: `id=eq.${entry.id}`,
      }, payload => {
        const newEntry = payload.new as Entry
        if (newEntry.ai_response) {
          set({ echoResponse: newEntry.ai_response, isStreaming: false })
          supabase.removeChannel(channel)
        }
      })
      .subscribe()

    // Trigger AI echo
    await supabase.functions.invoke('echo-ai', {
      body: { entry_id: entry.id, content, emotion, emotion_score: null },
    })

    // Also trigger emotion analysis
    supabase.functions.invoke('emotion-analyze', {
      body: { content, entry_id: entry.id },
    })

    // Optimistic update
    set(state => ({
      entries: [entry as Entry, ...state.entries],
      draft: null,
      isSubmitting: false,
    }))
  },

  rateEcho: async (entryId, rating) => {
    await supabase.from('entries').update({ echo_rating: rating }).eq('id', entryId)
    set(state => ({
      entries: state.entries.map(e => e.id === entryId ? { ...e, echoRating: rating } : e),
    }))
  },
}))
