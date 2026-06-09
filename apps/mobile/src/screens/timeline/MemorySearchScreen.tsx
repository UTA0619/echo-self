/**
 * MemorySearchScreen — Semantic memory search via pgvector
 *
 * User types a query, ECHO embeds it and returns the most semantically
 * similar memory chunks from the user's history.
 *
 * The search is debounced (600ms) and routes through the
 * memory-retrieve Supabase edge function (which calls OpenAI embeddings
 * on the backend — no API keys on the device).
 *
 * Presented as a full-screen modal from MainStackNavigator.
 */
import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Keyboard,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { supabase } from '../../services/supabase'
import { useAuthStore } from '../../store/auth'
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemoryResult {
  id: string
  content_chunk: string
  memory_date: string
  emotion: string | null
  importance_score: number
  similarityScore: number
}

// ── Utility ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch {
    return '—'
  }
}

const EMOTION_EMOJI: Record<string, string> = {
  joy: '☀️', sadness: '🌧', anger: '🔥', fear: '🌑', surprise: '✨',
  disgust: '🍂', anticipation: '🌅', trust: '🌿', optimism: '🌤',
  love: '💜', awe: '🌌',
}

// ── Result card ───────────────────────────────────────────────────────────────

function MemoryCard({ result, index }: { result: MemoryResult; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const relevance = Math.round(result.similarityScore * 100)
  const emoji = result.emotion ? EMOTION_EMOJI[result.emotion] ?? '' : ''

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <Pressable
        onPress={() => setExpanded(e => !e)}
        style={s.card}
        accessibilityRole="button"
        accessibilityLabel={`Memory from ${fmtDate(result.memory_date)}`}
      >
        {/* Header */}
        <View style={s.cardHeader}>
          <View style={s.cardMeta}>
            <Text style={s.cardDate}>{fmtDate(result.memory_date)}</Text>
            {emoji ? <Text style={s.cardEmoji}>{emoji}</Text> : null}
          </View>
          <View style={s.relevancePill}>
            <Text style={s.relevanceText}>{relevance}% match</Text>
          </View>
        </View>

        {/* Content */}
        <Text
          style={s.cardText}
          numberOfLines={expanded ? undefined : 3}
        >
          {result.content_chunk}
        </Text>

        {/* Expand toggle */}
        {result.content_chunk.length > 180 && (
          <Text style={s.expandToggle}>
            {expanded ? 'Show less' : 'Show more'}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function MemorySearchScreen() {
  const navigation = useNavigation()
  const { user } = useAuthStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MemoryResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<TextInput>(null)

  const handleSearch = useCallback(async (text: string) => {
    if (!text.trim() || text.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('memory-retrieve', {
        body: {
          query_text: text.trim(),
          user_id: user?.id,
          limit: 8,
          min_importance: 0,
        },
      })

      if (fnError) throw new Error(fnError.message)

      setResults(data?.memories ?? [])
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [user])

  function handleChange(text: string) {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => handleSearch(text), 600)
  }

  function handleClose() {
    Keyboard.dismiss()
    navigation.goBack()
  }

  const showEmpty = searched && !loading && results.length === 0

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={handleClose} style={s.backBtn} hitSlop={12}>
          <Text style={s.backIcon}>←</Text>
        </Pressable>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>✦</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleChange}
            placeholder="Search your memories…"
            placeholderTextColor={Colors.textTertiary}
            style={s.searchInput}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(query)}
            accessibilityLabel="Search memories"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults([]); setSearched(false) }} hitSlop={8}>
              <Text style={s.clearIcon}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Hint */}
      {!searched && !loading && query.length === 0 && (
        <Animated.View entering={FadeIn.duration(400)} style={s.hintBox}>
          <Text style={s.hintTitle}>Search your memory</Text>
          <Text style={s.hintBody}>
            Try phrases like{' '}
            <Text style={s.hintExample}>"when I was anxious about work"</Text>,{' '}
            <Text style={s.hintExample}>"my relationship with creativity"</Text>, or{' '}
            <Text style={s.hintExample}>"moments of joy"</Text>.{'\n\n'}
            ECHO searches semantically — it understands meaning, not just keywords.
          </Text>
        </Animated.View>
      )}

      {/* Loading */}
      {loading && (
        <View style={s.center}>
          <ActivityIndicator color={Colors.indigo} size="large" />
          <Text style={s.loadingText}>Searching your memories…</Text>
        </View>
      )}

      {/* Error */}
      {error && !loading && (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {/* Empty */}
      {showEmpty && (
        <Animated.View entering={FadeIn.duration(400)} style={s.center}>
          <Text style={s.emptyIcon}>🌊</Text>
          <Text style={s.emptyTitle}>No memories found</Text>
          <Text style={s.emptyBody}>
            Try different words or a longer phrase.{'\n'}
            Memories are indexed as you journal.
          </Text>
        </Animated.View>
      )}

      {/* Results */}
      {results.length > 0 && !loading && (
        <ScrollView
          style={s.results}
          contentContainerStyle={s.resultsContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.resultCount}>
            {results.length} memory{results.length !== 1 ? ' fragments' : ' fragment'} surfaced
          </Text>
          {results.map((r, i) => (
            <MemoryCard key={r.id} result={r} index={i} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.lg : Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border1,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchIcon: {
    color: Colors.indigo,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  clearIcon: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Hint
  hintBox: {
    flex: 1,
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  hintTitle: {
    ...Typography.headingLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  hintBody: {
    ...Typography.bodyMd,
    color: Colors.textTertiary,
    lineHeight: 24,
  },
  hintExample: {
    color: Colors.indigo,
    fontStyle: 'italic',
  },

  // Center states
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodySm,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySm,
    color: Colors.error,
    textAlign: 'center',
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    ...Typography.headingMd,
    color: Colors.textPrimary,
  },
  emptyBody: {
    ...Typography.bodySm,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Results
  results: { flex: 1 },
  resultsContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  resultCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardDate: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  cardEmoji: { fontSize: 14 },
  relevancePill: {
    backgroundColor: Colors.indigo + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  relevanceText: {
    ...Typography.caption,
    color: Colors.indigo,
    fontWeight: '600',
  },
  cardText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  expandToggle: {
    ...Typography.caption,
    color: Colors.indigo,
    marginTop: Spacing.xs,
  },
})
