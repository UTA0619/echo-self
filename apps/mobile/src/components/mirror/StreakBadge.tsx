import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Spacing } from '../../theme/tokens';

interface Props {
  streak: number;
}

export function StreakBadge({ streak }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (streak > 0) {
      scale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12 })
      );
    }
  }, [streak]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (streak === 0) return null;

  const isOnFire = streak >= 7;

  return (
    <Animated.View style={[styles.badge, animStyle, isOnFire && styles.onFire]}>
      <Text style={styles.flame}>{isOnFire ? '🔥' : '⚡'}</Text>
      <Text style={styles.count}>{streak}</Text>
      <Text style={styles.label}>day streak</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  onFire: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  flame: { fontSize: 14 },
  count: { fontSize: 15, fontWeight: '800', color: '#FBBF24' },
  label: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
});
