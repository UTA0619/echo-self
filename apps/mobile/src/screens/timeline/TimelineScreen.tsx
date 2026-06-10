import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../services/supabase';
import { Colors, Spacing } from '../../theme/tokens';
import type { MainStackParamList } from '../../navigation/MainStackNavigator';
import type { Entry } from '@echo-self/shared-types';

// ─── Emotion dot color map ────────────────────────────────────────────────────
const EMOTION_COLORS: Record<string, string> = {
  joy: Colors.joy,
  sadness: Colors.sadness,
  anger: Colors.anger,
  fear: Colors.fear,
  surprise: Colors.surprise,
  trust: Colors.trust,
  anticipation: Colors.anticipation,
};

// ─── Mini bar chart for emotion distribution ──────────────────────────────────
function EmotionBar({ emotion, count, max }: { emotion: string; count: number; max: number }) {
  const pct = max > 0 ? count / max : 0;
  const color = EMOTION_COLORS[emotion] ?? Colors.indigo;
  return (
    <View style={styles.emotionBarRow}>
      <View style={[styles.emotionDot, { backgroundColor: color }]} />
      <Text style={styles.emotionLabel}>{emotion}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { flex: pct, backgroundColor: color }]} />
        <View style={{ flex: 1 - pct }} />
      </View>
      <Text style={styles.emotionCount}>{count}</Text>
    </View>
  );
}

// ─── Single entry row ─────────────────────────────────────────────────────────
function EntryRow({ entry, index }: { entry: Entry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.created_at);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const emotion = entry.emotion ?? null;
  const dotColor = emotion ? (EMOTION_COLORS[emotion] ?? Colors.indigo) : Colors.surface2;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.entryRow}>
        {/* Left: date column */}
        <View style={styles.entryDateCol}>
          <Text style={styles.entryDate}>{dateStr}</Text>
          <Text style={styles.entryTime}>{timeStr}</Text>
        </View>

        {/* Timeline line + dot */}
        <View style={styles.timelineCol}>
          <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
          <View style={styles.timelineLine} />
        </View>

        {/* Content */}
        <View style={styles.entryContent}>
          <Text
            style={styles.entryText}
            numberOfLines={expanded ? undefined : 3}
          >
            {entry.content}
          </Text>
          {entry.ai_response && (
            <View style={styles.echoChip}>
              <Text style={styles.echoChipLabel}>ECHO</Text>
              <Text style={styles.echoChipText} numberOfLines={expanded ? undefined : 2}>
                {entry.ai_response}
              </Text>
            </View>
          )}
          {emotion && (
            <View style={[styles.emotionTag, { borderColor: dotColor + '40' }]}>
              <View style={[styles.emotionTagDot, { backgroundColor: dotColor }]} />
              <Text style={[styles.emotionTagText, { color: dotColor }]}>{emotion}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function TimelineScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setEntries(data ?? []);
  }, []);

  useEffect(() => {
    fetchEntries().finally(() => setLoading(false));
  }, [fetchEntries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }, [fetchEntries]);

  // Compute emotion distribution
  const emotionCounts: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.emotion) emotionCounts[e.emotion] = (emotionCounts[e.emotion] ?? 0) + 1;
  });
  const maxCount = Math.max(...Object.values(emotionCounts), 1);
  const sortedEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const totalWords = entries.reduce((acc, e) => acc + (e.word_count ?? 0), 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.indigo} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.indigo}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Timeline</Text>
            <Text style={styles.headerSub}>{entries.length} memories recorded</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('MemorySearch')}
            style={styles.searchBtn}
            accessibilityLabel="Search memories"
            accessibilityRole="button"
          >
            <Text style={styles.searchBtnIcon}>✦</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatChip label="Entries" value={entries.length.toString()} />
          <StatChip label="Total words" value={totalWords.toLocaleString()} />
          <StatChip
            label="Avg words"
            value={entries.length > 0 ? Math.round(totalWords / entries.length).toString() : '0'}
          />
        </View>

        {/* Emotion distribution */}
        {sortedEmotions.length > 0 && (
          <View style={styles.emotionSection}>
            <Text style={styles.sectionTitle}>Emotional landscape</Text>
            {sortedEmotions.map(([emotion, count]) => (
              <EmotionBar key={emotion} emotion={emotion} count={count} max={maxCount} />
            ))}
          </View>
        )}

        {/* Entry list */}
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyText}>Your first memory will appear here.</Text>
            <Text style={styles.emptySub}>Write your first entry in the Mirror tab.</Text>
          </View>
        ) : (
          <View style={styles.entryList}>
            <Text style={styles.sectionTitle}>Memories</Text>
            {entries.map((entry, i) => (
              <EntryRow key={entry.id} entry={entry} index={i} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  center: { flex: 1, backgroundColor: Colors.black, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.md, paddingBottom: 120 },

  header: { marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  searchBtnIcon: { color: '#4F46E5', fontSize: 14 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statChip: {
    flex: 1,
    backgroundColor: Colors.surface1,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border0,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },

  emotionSection: { marginBottom: Spacing.lg },
  emotionBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  emotionDot: { width: 8, height: 8, borderRadius: 4 },
  emotionLabel: { fontSize: 12, color: Colors.textSecondary, width: 80 },
  barTrack: { flex: 1, flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: Colors.surface1 },
  barFill: { borderRadius: 2 },
  emotionCount: { fontSize: 11, color: Colors.textTertiary, width: 24, textAlign: 'right' },

  entryList: {},
  entryRow: { flexDirection: 'row', marginBottom: Spacing.md, gap: Spacing.sm },
  entryDateCol: { width: 48, paddingTop: 2 },
  entryDate: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  entryTime: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  timelineCol: { alignItems: 'center', width: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  timelineLine: { flex: 1, width: 1, backgroundColor: Colors.border0, marginTop: 4 },
  entryContent: { flex: 1 },
  entryText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  echoChip: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface0,
    borderRadius: 8,
    padding: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.indigo,
  },
  echoChipLabel: { fontSize: 9, fontWeight: '700', color: Colors.indigo, letterSpacing: 1, marginBottom: 2 },
  echoChipText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  emotionTagDot: { width: 6, height: 6, borderRadius: 3 },
  emotionTagText: { fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
