import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 100;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const CENTER = SIZE / 2;

interface Props {
  confidence: number;  // 0–1
  color: string;
  delay?: number;
}

export function ConfidenceRing({ confidence, color, delay = 600 }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(confidence, { duration: 1400, easing: Easing.out(Easing.cubic) })
    );
  }, [confidence]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const pct = Math.round(confidence * 100);

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        {/* Background track */}
        <Circle
          cx={CENTER} cy={CENTER} r={R}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={CENTER} cy={CENTER} r={R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${CENTER}, ${CENTER}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.pct, { color }]}>{pct}%</Text>
        <Text style={styles.label}>confidence</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
