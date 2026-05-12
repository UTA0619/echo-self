import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { HapticPatterns } from '../../theme/haptics';
import { Colors, Spacing } from '../../theme/tokens';
import type { EmotionType } from '@echo-self/shared-types';

const EMOTION_CONFIG: Record<EmotionType, { emoji: string; label: string; color: string }> = {
  joy:          { emoji: '✨', label: 'Joy',          color: '#FBBF24' },
  sadness:      { emoji: '💧', label: 'Sadness',      color: '#6366F1' },
  anger:        { emoji: '🔥', label: 'Anger',        color: '#EF4444' },
  fear:         { emoji: '🌑', label: 'Fear',         color: '#374151' },
  surprise:     { emoji: '⚡', label: 'Surprise',     color: '#06B6D4' },
  disgust:      { emoji: '🌿', label: 'Disgust',      color: '#10B981' },
  anticipation: { emoji: '🌅', label: 'Anticipation', color: '#F59E0B' },
  trust:        { emoji: '🌸', label: 'Trust',        color: '#EC4899' },
  optimism:     { emoji: '☀️', label: 'Optimism',     color: '#FCD34D' },
  love:         { emoji: '💜', label: 'Love',         color: '#8B5CF6' },
  awe:          { emoji: '🌌', label: 'Awe',          color: '#4F46E5' },
};

interface Props {
  emotion: EmotionType;
  selected: boolean;
  disabled: boolean;
  onToggle: (emotion: EmotionType) => void;
}

export function EmotionCard({ emotion, selected, disabled, onToggle }: Props) {
  const config = EMOTION_CONFIG[emotion];
  const progress = useSharedValue(selected ? 1 : 0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, { damping: 15, stiffness: 300 });
  }, [selected]);

  const animStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(progress.value, [0, 1], ['rgba(255,255,255,0.06)', `${config.color}22`]);
    return {
      backgroundColor: bg,
      transform: [{ scale: scale.value }],
      borderColor: progress.value > 0.5 ? config.color : 'rgba(255,255,255,0.1)',
      borderWidth: 1.5,
    };
  });

  const handlePress = async () => {
    if (disabled && !selected) return;
    scale.value = withSpring(0.94, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    await HapticPatterns.light();
    onToggle(emotion);
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.card, animStyle]}>
        <Text style={styles.emoji}>{config.emoji}</Text>
        <Text style={[styles.label, selected && { color: config.color }]}>{config.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 96,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.silver,
    letterSpacing: 0.2,
  },
});
