import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing } from '../../theme/tokens';
import type { Entry } from '@echo-self/shared-types';

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(text: string, maxLen = 120): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

interface Props {
  entry: Entry;
  onPress?: (entry: Entry) => void;
}

export function EntryCard({ entry, onPress }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => { scale.value = withSpring(0.98, { damping: 15, stiffness: 400 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 12 }); };

  const hasEcho = !!entry.ai_response;

  return (
    <Pressable
      onPress={() => onPress?.(entry)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.card, animStyle]}>
        <View style={styles.dateRow}>
          <Text style={styles.date}>{formatRelativeDate(entry.created_at)}</Text>
          {hasEcho && <View style={styles.echoPill}><Text style={styles.echoPillText}>echo ✦</Text></View>}
        </View>
        <Text style={styles.content}>{truncate(entry.content)}</Text>
        {entry.ai_response && (
          <Text style={styles.echoPreview} numberOfLines={2}>
            "{truncate(entry.ai_response, 80)}"
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: Spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 12,
    color: Colors.silver,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  echoPill: {
    backgroundColor: 'rgba(79,70,229,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.4)',
  },
  echoPillText: {
    fontSize: 10,
    color: Colors.indigo,
    fontWeight: '600',
  },
  content: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },
  echoPreview: {
    fontSize: 13,
    color: Colors.violet,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
