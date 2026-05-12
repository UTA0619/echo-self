import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTimelineStore } from '../../store/timeline';
import { useAuthStore } from '../../store/auth';
import { EmotionalArcChart } from '../../components/timeline/EmotionalArcChart';
import { EmotionCalendar } from '../../components/timeline/EmotionCalendar';
import { MemorySearchBar } from '../../components/timeline/MemorySearchBar';
import { TimelineEntryCard } from '../../components/timeline/TimelineEntryCard';
import { StatsRow } from '../../components/timeline/StatsRow';
import { Colors, Spacing } from '../../theme/tokens';
import type { DayData } from '../../store/timeline';

export function TimelineScreen() {
  const { user } = useAuthStore();
  const {
    entries,
    dayMap,
    arcPoints,
    searchQuery,
    searchResults,
    isLoading,
    isSearching,
    loadTimeline,
    searchMemories,
    setSearchQuery,
    clearSearch,
  } = useTimelineStore();

  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTimeline(days);
  }, [days]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTimeline(days);
    setRefreshing(false);
  }, [days]);

  const handleSearch = (q: string) => {
    if (user) searchMemories(q, user.id);
  };

  const handleQueryChange = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) clearSearch();
  };

  // Stats
  const totalWords = entries.reduce((sum, e) => sum + (e.word_count ?? 0), 0);
  const echoCount = entries.filter((e) => !!e.ai_response).length;
  const avgWords = entries.length > 0 ? Math.round(totalWords / entries.length) : 0;

  const stats = [
    { value: entries.length, label: 'entries', color: Colors.indigo },
    { value: totalWords.toLocaleString(), label: 'total words' },
    { value: echoCount, label: 'echoes', color: Colors.violet },
    { value: avgWords, label: 'avg words' },
  ];

  const isSearchMode = searchQuery.length > 0;
  const displayEntries = isSearchMode ? searchResults : entries;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.indigo}
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <Text style={styles.title}>Memory Timeline</Text>
            <Text style={styles.subtitle}>
              {days === 30 ? 'Last 30 days' : days === 7 ? 'Last 7 days' : `Last ${days} days`}
            </Text>
          </Animated.View>

          {/* Search */}
          <MemorySearchBar
            value={searchQuery}
            onChange={handleQueryChange}
            onSearch={handleSearch}
            onClear={clearSearch}
            isSearching={isSearching}
          />

          {!isSearchMode && (
            <>
              {/* Stats */}
              <StatsRow stats={stats} />

              {/* Emotional Arc Chart */}
              <EmotionalArcChart points={arcPoints} days={days} />

              {/* Calendar */}
              <EmotionCalendar
                dayMap={dayMap}
                weeks={8}
                onDayPress={(day, date) => setSelectedDay(day)}
              />

              {/* Selected day */}
              {selectedDay && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.selectedDay}>
                  <Text style={styles.selectedDayTitle}>
                    {new Date(selectedDay.date).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.selectedDayMeta}>
                    {selectedDay.entries.length} entr{selectedDay.entries.length === 1 ? 'y' : 'ies'} ·{' '}
                    {selectedDay.wordCount} words
                    {selectedDay.dominantEmotion ? ` · ${selectedDay.dominantEmotion}` : ''}
                  </Text>
                </Animated.View>
              )}
            </>
          )}

          {/* Entry list */}
          <View style={styles.entries}>
            <Text style={styles.sectionTitle}>
              {isSearchMode
                ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
                : 'All reflections'}
            </Text>

            {displayEntries.length === 0 && !isLoading && (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>{isSearchMode ? '🔍' : '📖'}</Text>
                <Text style={styles.emptyText}>
                  {isSearchMode
                    ? 'No memories match that search'
                    : 'Your entries will appear here after you write them'}
                </Text>
              </View>
            )}

            {displayEntries.map((entry, i) => (
              <TimelineEntryCard
                key={entry.id}
                entry={entry}
                index={i}
                searchHighlight={isSearchMode ? searchQuery : undefined}
              />
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {},
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: { fontSize: 13, color: Colors.silver, opacity: 0.6, marginTop: 3 },
  selectedDay: {
    backgroundColor: 'rgba(79,70,229,0.1)',
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.3)',
    gap: 4,
  },
  selectedDayTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  selectedDayMeta: { fontSize: 12, color: Colors.silver, textTransform: 'capitalize' },
  entries: { gap: Spacing.md },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.silver,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 40 },
  emptyText: {
    fontSize: 14,
    color: Colors.silver,
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 22,
  },
});
