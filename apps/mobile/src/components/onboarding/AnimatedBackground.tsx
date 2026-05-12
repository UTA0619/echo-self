import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../theme/tokens';

const { width, height } = Dimensions.get('window');

interface Orb {
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
}

const ORBS: Orb[] = [
  { x: 0.15, y: 0.2,  size: 280, color: Colors.indigo,  duration: 8000 },
  { x: 0.7,  y: 0.15, size: 200, color: Colors.violet,  duration: 10000 },
  { x: 0.5,  y: 0.6,  size: 240, color: '#1a1a3e',       duration: 12000 },
  { x: 0.1,  y: 0.75, size: 180, color: Colors.cyan,     duration: 9000 },
];

function OrbComponent({ orb, index }: { orb: Orb; index: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.12);

  useEffect(() => {
    const delay = index * 600;
    setTimeout(() => {
      translateY.value = withRepeat(
        withTiming(-30, { duration: orb.duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      opacity.value = withRepeat(
        withTiming(0.22, { duration: orb.duration * 0.8 }),
        -1,
        true
      );
    }, delay);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        animStyle,
        {
          left: orb.x * width - orb.size / 2,
          top: orb.y * height - orb.size / 2,
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          backgroundColor: orb.color,
        },
      ]}
    />
  );
}

export function AnimatedBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {ORBS.map((orb, i) => (
        <OrbComponent key={i} orb={orb} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    // Soft blur effect via shadow
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 60,
    elevation: 0,
  },
});
