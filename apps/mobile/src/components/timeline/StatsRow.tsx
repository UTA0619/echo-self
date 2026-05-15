import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Spacing } from '../../theme/tokens';

interface StatItem {
  value: string | number;
  label: string;
  color?: string;
}

interface Props {
  stats: StatItem[];
}

export function StatsRow({ stats }: Props) {
  return (
    <Animated.View entering={FadeIn.delay(100).duration(500)} style={styles.container}>
      {stats.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.stat}>
            <Text style={[styles.value, s.color ? { color: s.color } : {}]}>{s.value}</Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  value: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  label: { fontSize: 11, color: Colors.silver, opacity: 0.7, textAlign: 'center' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
});
