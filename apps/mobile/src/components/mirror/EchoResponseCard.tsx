import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTypewriter } from '../../hooks/useTypewriter';
import { EmotionBadge } from './EmotionBadge';
import { Colors, Spacing } from '../../theme/tokens';
import type { EmotionAnalysis } from '@echo-self/shared-types';
import type { StreamState } from '../../store/entries';

interface Props {
  streamState: StreamState;
  echoText: string;
  emotion: EmotionAnalysis | null;
  userName: string;
}

export function EchoResponseCard({ streamState, echoText, emotion, userName }: Props) {
  const displayed = useTypewriter(echoText, 16);

  if (streamState === 'idle') return null;

  const isLoading = streamState === 'submitting' || (streamState === 'streaming' && !echoText);
  const isStreaming = streamState === 'streaming' && echoText.length > 0;
  const isComplete = streamState === 'complete';
  const isError = streamState === 'error';

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.wrapper}>
      <BlurView intensity={20} tint="dark" style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.echoDot} />
          <Text style={styles.headerText}>
            {isLoading ? 'Your echo is reflecting…' : `Echo to ${userName}`}
          </Text>
          {(isStreaming) && (
            <ActivityIndicator size="small" color={Colors.indigo} style={{ marginLeft: 6 }} />
          )}
        </View>

        {/* Content */}
        {isLoading && (
          <View style={styles.loadingRow}>
            <View style={[styles.shimmer, { width: '90%' }]} />
            <View style={[styles.shimmer, { width: '75%' }]} />
            <View style={[styles.shimmer, { width: '60%' }]} />
          </View>
        )}

        {(isStreaming || isComplete) && displayed.length > 0 && (
          <Text style={styles.echoText}>
            {displayed}
            {isStreaming && <Text style={styles.cursor}>│</Text>}
          </Text>
        )}

        {isError && (
          <Text style={styles.errorText}>
            Your echo couldn't reach you this time. Please try again.
          </Text>
        )}

        {/* Emotion badge */}
        {isComplete && emotion && (
          <View style={styles.emotionSection}>
            <Text style={styles.emotionLabel}>Detected emotion</Text>
            <EmotionBadge
              emotion={emotion.emotion}
              intensity={emotion.intensity}
              themes={emotion.themes}
            />
          </View>
        )}
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Spacing.lg,
  },
  card: {
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.3)',
    overflow: 'hidden',
    backgroundColor: 'rgba(79,70,229,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  echoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.indigo,
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.silver,
    letterSpacing: 0.3,
    flex: 1,
  },
  loadingRow: {
    gap: 10,
    paddingVertical: 4,
  },
  shimmer: {
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 7,
  },
  echoText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 26,
    fontWeight: '300',
    letterSpacing: 0.2,
  },
  cursor: {
    color: Colors.indigo,
    fontWeight: '100',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    fontStyle: 'italic',
  },
  emotionSection: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: Spacing.md,
  },
  emotionLabel: {
    fontSize: 11,
    color: Colors.silver,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
