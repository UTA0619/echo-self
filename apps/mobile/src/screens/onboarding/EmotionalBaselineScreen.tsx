// ECHO//SELF — Screen 3/5: Emotional Baseline
import React, { useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator'
import { AnimatedBackground } from '../../components/onboarding/AnimatedBackground'
import { OnboardingButton } from '../../components/onboarding/OnboardingButton'
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress'
import { EmotionCard } from '../../components/onboarding/EmotionCard'
import { useOnboardingStore } from '../../store/onboarding'
import { Colors, Spacing, Typography } from '../../theme/tokens'
import type { EmotionType } from '@echo-self/shared-types'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'EmotionalBaseline'>

// Emotions rendered in grid — hoisted to avoid re-creation (rendering-hoist-jsx)
const EMOTIONS: EmotionType[] = [
  'joy', 'sadness', 'anger', 'fear',
  'surprise', 'disgust', 'anticipation', 'trust',
  'optimism', 'love', 'awe',
]

const MAX_SELECTIONS = 3

export function EmotionalBaselineScreen({ navigation }: Props) {
  const { selectedEmotions, toggleEmotion, name } = useOnboardingStore()

  const contentOpacity = useSharedValue(0)
  const contentY       = useSharedValue(20)

  useEffect(() => {
    contentOpacity.value = withDelay(100, withTiming(1, { duration: 600 }))
    contentY.value       = withDelay(100, withTiming(0, { duration: 500 }))
  }, [])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }))

  const canContinue = selectedEmotions.length >= 1
  const atMax       = selectedEmotions.length >= MAX_SELECTIONS

  return (
    <View style={styles.root}>
      <AnimatedBackground />

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.header, contentStyle]}>
          <OnboardingProgress currentStep={2} />
          <Text style={styles.heading}>
            {name ? `${name}, how do you\nfeel most often?` : 'How do you\nfeel most often?'}
          </Text>
          <Text style={styles.subtext}>
            Pick up to {MAX_SELECTIONS} emotions. Echo learns your baseline to detect shifts over time.
          </Text>

          {/* Selection counter */}
          <View style={styles.counterRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.counterDot,
                  i < selectedEmotions.length && styles.counterDotActive,
                ]}
              />
            ))}
            <Text style={styles.counterText}>
              {selectedEmotions.length} / {MAX_SELECTIONS} selected
            </Text>
          </View>
        </Animated.View>

        {/* Emotion grid */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {EMOTIONS.map((emotion) => (
            <EmotionCard
              key={emotion}
              emotion={emotion}
              selected={selectedEmotions.includes(emotion)}
              disabled={atMax && !selectedEmotions.includes(emotion)}
              onToggle={toggleEmotion}
            />
          ))}
          <View style={styles.gridBottomPad} />
        </ScrollView>

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <OnboardingButton
            label="Continue →"
            onPress={() => navigation.navigate('Notifications')}
            disabled={!canContinue}
            style={styles.cta}
          />
          <OnboardingButton
            label="← Back"
            onPress={() => navigation.goBack()}
            variant="ghost"
          />
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  heading: {
    ...Typography.displayMd,
    color: Colors.white,
    marginTop: Spacing.lg,
  },
  subtext: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  counterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  counterDotActive: {
    backgroundColor: Colors.indigo,
    borderColor: Colors.indigo,
  },
  counterText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  scrollView: {
    flex: 1,
    marginTop: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    justifyContent: 'flex-start',
  },
  gridBottomPad: {
    height: Spacing.xl,
    width: '100%',
  },
  ctaContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  cta: {
    width: '100%',
  },
})
