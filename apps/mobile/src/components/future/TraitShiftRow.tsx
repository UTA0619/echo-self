import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { TraitShift } from '../../store/futureSelf';

const DIRECTION_COLORS = {
  growth:         { color: '#10B981', emoji: '↑' },
  healing:        { color: '#EC4899', emoji: '◈' },
  transformation: { color: '#8B5CF6', emoji: '⟳' },
  integration:    { color: '#06B6D4', emoji: '∞' },
};

interface Props {
  shift: TraitShift;
  index: number;
  accentColor: string;
}

export function TraitShiftRow({ shift, index, accentColor }: Props) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-16);
  const barWidth = useSharedValue(0);

  useEffect(() => {
    const d = 300 + index * 120;
    opacity.value = withDelay(d, withTiming(1, { duration: 500 }));
    translateX.value = withDelay(d, withSpring(0, { damping: 15, stiffness: 200 }));
    barWidth.value = withDelay(d + 200, withTiming(shift.magnitude, { duration: 800 }));
  }, []);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  const dirConfig = DIRECTION_COLORS[shift.direction];

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={styles.header}>
        <Text style={styles.trait}>{shift.trait}</Text>
        <Text style={[styles.direction, { color: dirConfig.color }]}>
          {dirConfig.emoji} {shift.direction}
        </Text>
      </View>
      <View style={styles.shiftRow}>
        <Text style={styles.from}>{shift.from}</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={[styles.to, { color: accentColor }]}>{shift.to}</Text>
      </View>
      <View style={styles.bar}>
        <Animated.View style={[styles.fill, barStyle, { backgroundColor: dirConfig.color }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trait: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.2,
  },
  direction: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'capitalize',
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  from: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    flex: 1,
  },
  arrow: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  to: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  bar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    borderRadius: 2,
    opacity: 0.7,
  },
});
