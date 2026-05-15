import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import type { EmotionType } from '@echo-self/shared-types';

const EMOTION_CONFIG: Record<EmotionType, { emoji: string; color: string; label: string }> = {
  joy:          { emoji: '✨', color: '#FBBF24', label: 'Joy' },
  sadness:      { emoji: '💧', color: '#6366F1', label: 'Sadness' },
  anger:        { emoji: '🔥', color: '#EF4444', label: 'Anger' },
  fear:         { emoji: '🌑', color: '#9CA3AF', label: 'Fear' },
  surprise:     { emoji: '⚡', color: '#06B6D4', label: 'Surprise' },
  disgust:      { emoji: '🌿', color: '#10B981', label: 'Disgust' },
  anticipation: { emoji: '🌅', color: '#F59E0B', label: 'Anticipation' },
  trust:        { emoji: '🌸', color: '#EC4899', label: 'Trust' },
  optimism:     { emoji: '☀️', color: '#FCD34D', label: 'Optimism' },
  love:         { emoji: '💜', color: '#8B5CF6', label: 'Love' },
  awe:          { emoji: '🌌', color: '#4F46E5', label: 'Awe' },
};

interface Props {
  emotion: EmotionType;
  intensity: number; // 0–1
  themes?: string[];
}

export function EmotionBadge({ emotion, intensity, themes }: Props) {
  const config = EMOTION_CONFIG[emotion];
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 200 }));
    opacity.value = withDelay(200, withSpring(1));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const intensityPercent = Math.round(intensity * 100);

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <View style={[styles.badge, { borderColor: `${config.color}55`, backgroundColor: `${config.color}18` }]}>
        <Text style={styles.emoji}>{config.emoji}</Text>
        <View style={styles.info}>
          <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
          <Text style={styles.intensity}>{intensityPercent}% intensity</Text>
        </View>
        <View style={styles.intensityBar}>
          <View
            style={[
              styles.intensityFill,
              { width: `${intensityPercent}%`, backgroundColor: config.color },
            ]}
          />
        </View>
      </View>
      {themes && themes.length > 0 && (
        <View style={styles.themes}>
          {themes.slice(0, 3).map((theme, i) => (
            <View key={i} style={[styles.theme, { borderColor: `${config.color}44` }]}>
              <Text style={[styles.themeText, { color: config.color }]}>{theme}</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    overflow: 'hidden',
  },
  emoji: { fontSize: 22 },
  info: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600' },
  intensity: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  intensityBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  intensityFill: { height: 2, borderRadius: 1, opacity: 0.7 },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  theme: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  themeText: { fontSize: 11, fontWeight: '500' },
});
