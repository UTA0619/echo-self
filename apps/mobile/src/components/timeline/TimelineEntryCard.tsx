import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import type { Entry } from '@echo-self/shared-types';
import type { EmotionType } from '@echo-self/shared-types';
import { Colors, Spacing } from '../../theme/tokens';

const EMOTION_COLORS: Record<EmotionType, string> = {
  joy: '#FBBF24', sadness: '#6366F1', anger: '#EF4444', fear: '#9CA3AF',
  surprise: '#06B6D4', disgust: '#10B981', anticipation: '#F59E0B',
  trust: '#EC4899', optimism: '#FCD34D', love: '#8B5CF6', awe: '#4F46E5',
};

const EMOTION_EMOJIS: Record<EmotionType, string> = {
  joy: '✨', sadness: '💧', anger: '🔥', fear: '🌑', surprise: '⚡',
  disgust: '🌿', anticipation: '🌅', trust: '🌸', optimism: '☀️', love: '💜', awe: '🌌',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

interface Props {
  entry: Entry;
  index: number;
  searchHighlight?: string;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <Text key={i} style={{ backgroundColor: 'rgba(79,70,229,0.4)', color: '#FFFFFF' }}>{part}</Text>
      : part
  );
}

export function TimelineEntryCard({ entry, index, searchHighlight }: Props) {
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(1);
  const maxHeightVal = useSharedValue(0);

  const emotion = (entry.emotion_data as { emotion: EmotionType } | null)?.emotion ?? null;
  const intensity = (entry.emotion_data as { intensity: number } | null)?.intensity ?? 0;
  const color = emotion ? EMOTION_COLORS[emotion] : 'rgba(255,255,255,0.15)';

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.98, { damping: 15 }, () => {
      scale.value = withSpring(1);
    });
    setExpanded((e) => !e);
  };

  const previewLength = expanded ? entry.content.length : 140;
  const needsTruncation = entry.content.length > 140;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <Pressable onPress={handlePress}>
        <Animated.View style={[styles.card, { borderLeftColor: color }, cardStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dateRow}>
              {emotion && <Text style={styles.emotionEmoji}>{EMOTION_EMOJIS[emotion]}</Text>}
              <Text style={styles.date}>{formatDate(entry.created_at)}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.wordCount}>{entry.word_count}w</Text>
              {entry.ai_response && (
                <View style={styles.echoPill}>
                  <Text style={styles.echoPillText}>echo ✦</Text>
                </View>
              )}
            </View>
          </View>

          {/* Content */}
          <Text style={styles.content} numberOfLines={expanded ? undefined : 3}>
            {searchHighlight
              ? highlight(entry.content.slice(0, previewLength), searchHighlight)
              : entry.content.slice(0, previewLength)}
            {!expanded && needsTruncation && (
              <Text style={styles.more}> …read more</Text>
            )}
          </Text>

          {/* Echo preview */}
          {expanded && entry.ai_response && (
            <View style={[styles.echoSection, { borderLeftColor: color }]}>
              <Text style={styles.echoLabel}>echo</Text>
              <Text style={[styles.echoText, { color }]}>{entry.ai_response.slice(0, 240)}</Text>
            </View>
          )}

          {/* Emotion bar */}
          {emotion && (
            <View style={styles.emotionBar}>
              <View style={[styles.emotionFill, { width: `${intensity * 100}%`, backgroundColor: color }]} />
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: Spacing.md,
    gap: 8,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emotionEmoji: { fontSize: 14 },
  date: { fontSize: 12, color: Colors.silver, fontWeight: '500' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordCount: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  echoPill: {
    backgroundColor: 'rgba(79,70,229,0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  echoPillText: { fontSize: 9, color: Colors.indigo, fontWeight: '700' },
  content: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 22 },
  more: { color: Colors.indigo, fontWeight: '500' },
  echoSection: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    gap: 3,
  },
  echoLabel: { fontSize: 10, color: Colors.silver, opacity: 0.5, letterSpacing: 0.8, fontWeight: '700' },
  echoText: { fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  emotionBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  emotionFill: { height: 2, borderRadius: 1, opacity: 0.6 },
});
