import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ConfidenceRing } from './ConfidenceRing';
import type { FutureSelfPrediction } from '../../store/futureSelf';
import { ARCHETYPE_CONFIG } from './archetypeConfig';
import { Colors, Spacing } from '../../theme/tokens';
import { HapticPatterns } from '../../theme/haptics';

const { width: W } = Dimensions.get('window');
const CARD_W = W - Spacing.xl * 2;

interface Props {
  prediction: FutureSelfPrediction;
  isRevealed: boolean;
  onReveal: () => void;
}

export function PersonaCard({ prediction, isRevealed, onReveal }: Props) {
  const config = ARCHETYPE_CONFIG[prediction.visualArchetype];

  // Reveal animation values
  const flipValue   = useSharedValue(isRevealed ? 1 : 0);
  const glowOpacity = useSharedValue(0);
  const pulseScale  = useSharedValue(1);
  const symbolRotate = useSharedValue(0);

  useEffect(() => {
    if (isRevealed) {
      flipValue.value = withSpring(1, { damping: 16, stiffness: 100 });
      glowOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
      symbolRotate.value = withRepeat(
        withTiming(360, { duration: 12000, easing: Easing.linear }),
        -1, false
      );
    }
  }, [isRevealed]);

  const handleReveal = async () => {
    await HapticPatterns.predictionReveal();
    onReveal();
    flipValue.value = withSpring(1, { damping: 14, stiffness: 90 });
    glowOpacity.value = withDelay(500, withTiming(1, { duration: 1000 }));
    symbolRotate.value = withDelay(600, withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1, false
    ));
  };

  // Front face (locked state)
  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0, 0.4], [1, 0]),
    transform: [{ rotateY: `${interpolate(flipValue.value, [0, 1], [0, 180])}deg` }],
  }));

  // Back face (revealed)
  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipValue.value, [0.5, 1], [0, 1]),
    transform: [{ rotateY: `${interpolate(flipValue.value, [0, 1], [180, 360])}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const symbolStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${symbolRotate.value}deg` }],
  }));

  const timeLabel = { '30d': '30 Days', '90d': '90 Days', '1y': '1 Year' }[prediction.timeHorizon];

  return (
    <View style={styles.wrapper}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          glowStyle,
          { shadowColor: config.primaryColor },
        ]}
      />

      {/* Card face: locked */}
      {!isRevealed && (
        <Animated.View style={[styles.card, styles.frontCard, frontStyle]}>
          <Pressable onPress={handleReveal} style={styles.lockContent}>
            <Animated.Text style={[styles.lockSymbol, symbolStyle]}>
              {config.symbol}
            </Animated.Text>
            <Text style={styles.lockTitle}>Your Future Self</Text>
            <Text style={styles.lockSub}>
              Based on {prediction.entryCount} entries over {timeLabel}
            </Text>
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>tap to reveal ✦</Text>
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* Card face: revealed */}
      {isRevealed && (
        <Animated.View style={[styles.card, backStyle]}>
          <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFillObject} />

          {/* Archetype header */}
          <View style={[styles.archetypeHeader, { backgroundColor: `${config.primaryColor}22` }]}>
            <Text style={styles.archetypeEmoji}>{config.emoji}</Text>
            <View style={styles.archetypeInfo}>
              <Text style={[styles.archetypeLabel, { color: config.primaryColor }]}>
                {config.label}
              </Text>
              <Text style={styles.timeRange}>in {timeLabel}</Text>
            </View>
            <ConfidenceRing
              confidence={prediction.confidenceScore}
              color={config.primaryColor}
              delay={400}
            />
          </View>

          {/* Persona name */}
          <View style={styles.personaSection}>
            <Text style={styles.personaName}>{prediction.personaName}</Text>
            <Text style={[styles.archTagline, { color: config.secondaryColor }]}>
              {config.tagline}
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{prediction.description}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_W,
    minHeight: 280,
    alignSelf: 'center',
  },
  glow: {
    position: 'absolute',
    inset: -20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 0,
  },
  card: {
    width: '100%',
    minHeight: 280,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  frontCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    flex: 1,
    width: '100%',
  },
  lockSymbol: {
    fontSize: 56,
    color: Colors.indigo,
    opacity: 0.8,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  lockSub: {
    fontSize: 14,
    color: Colors.silver,
    textAlign: 'center',
    opacity: 0.7,
  },
  tapHint: {
    marginTop: Spacing.md,
    backgroundColor: 'rgba(79,70,229,0.2)',
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.4)',
  },
  tapHintText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.indigo,
    letterSpacing: 0.5,
  },
  archetypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  archetypeEmoji: { fontSize: 32 },
  archetypeInfo: { flex: 1 },
  archetypeLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timeRange: { fontSize: 12, color: Colors.silver, opacity: 0.6, marginTop: 2 },
  personaSection: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 6,
  },
  personaName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  archTagline: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    fontWeight: '300',
  },
});
