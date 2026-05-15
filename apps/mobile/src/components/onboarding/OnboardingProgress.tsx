import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing } from '../../theme/tokens';

const TOTAL_STEPS = 5;

interface Props {
  currentStep: number;
}

export function OnboardingProgress({ currentStep }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <DotIndicator key={i} isActive={i === currentStep} isPast={i < currentStep} />
      ))}
    </View>
  );
}

function DotIndicator({ isActive, isPast }: { isActive: boolean; isPast: boolean }) {
  const animStyle = useAnimatedStyle(() => ({
    width: withSpring(isActive ? 24 : 8, { damping: 15, stiffness: 200 }),
    opacity: withSpring(isPast ? 0.5 : isActive ? 1 : 0.25),
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        animStyle,
        { backgroundColor: isPast || isActive ? Colors.indigo : Colors.silver },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
