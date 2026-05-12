import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { DayData } from '../../store/timeline';
import type { EmotionType } from '@echo-self/shared-types';
import { Colors, Spacing } from '../../theme/tokens';

const EMOTION_COLORS: Record<EmotionType, string> = {
  joy: '#FBBF24', sadness: '#6366F1', anger: '#EF4444', fear: '#9CA3AF',
  surprise: '#06B6D4', disgust: '#10B981', anticipation: '#F59E0B',
  trust: '#EC4899', optimism: '#FCD34D', love: '#8B5CF6', awe: '#4F46E5',
};

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  dayMap: Record<string, DayData>;
  weeks?: number;
  onDayPress?: (day: DayData | null, date: string) => void;
}

function getLast(weeks: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  // Pad to start of current week (Sunday)
  const startPad = today.getDay();
  const totalDays = weeks * 7;
  const start = new Date(today);
  start.setDate(today.getDate() - (totalDays - 1 + startPad));

  for (let i = 0; i < totalDays + startPad; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

interface DayCellProps {
  date: string;
  data: DayData | null;
  isToday: boolean;
  onPress: () => void;
}

function DayCell({ date, data, isToday, onPress }: DayCellProps) {
  const color = data?.dominantEmotion ? EMOTION_COLORS[data.dominantEmotion] : null;
  const opacity = data ? Math.max(0.25, data.avgIntensity) : 0;

  return (
    <Pressable onPress={onPress} style={styles.cell}>
      <View
        style={[
          styles.dot,
          isToday && styles.todayDot,
          color ? { backgroundColor: color, opacity } : styles.emptyDot,
        ]}
      />
    </Pressable>
  );
}

export function EmotionCalendar({ dayMap, weeks = 8, onDayPress }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dates = useMemo(() => getLast(weeks), [weeks]);

  // Group into weeks (columns)
  const columns: string[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    columns.push(dates.slice(i, i + 7));
  }

  const entriesThisMonth = Object.values(dayMap).length;

  return (
    <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reflection calendar</Text>
        <Text style={styles.subtitle}>{entriesThisMonth} entries · 8 weeks</Text>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAYS_OF_WEEK.map((d, i) => (
          <Text key={i} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {columns.map((col, ci) => (
          <View key={ci} style={styles.column}>
            {col.map((date, ri) => (
              <DayCell
                key={date}
                date={date}
                data={dayMap[date] ?? null}
                isToday={date === todayStr}
                onPress={() => onDayPress?.(dayMap[date] ?? null, date)}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>emotions →</Text>
        {(['joy', 'love', 'awe', 'sadness', 'anger'] as EmotionType[]).map((e) => (
          <View key={e} style={[styles.legendDot, { backgroundColor: EMOTION_COLORS[e] }]} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: Spacing.md,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.silver,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  dayLabels: { flexDirection: 'row', justifyContent: 'space-around' },
  dayLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    width: 20,
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', justifyContent: 'space-around', gap: 3 },
  column: { gap: 3 },
  cell: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  emptyDot: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  todayDot: {
    borderWidth: 1.5,
    borderColor: Colors.indigo,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
