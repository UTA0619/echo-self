// ECHO//SELF — Screen 2/5: Name
import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native'
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
import { useOnboardingStore } from '../../store/onboarding'
import { Colors, Spacing, Typography } from '../../theme/tokens'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Name'>

// Static content hoisted outside component (rendering-hoist-jsx)
const HEADER_TEXT = 'What should Echo\ncall you?'
const SUBTEXT = 'This is just your display name inside the app. You can change it later.'

export function NameScreen({ navigation }: Props) {
  const { name, setName } = useOnboardingStore()
  const inputRef = useRef<TextInput>(null)

  const contentOpacity = useSharedValue(0)
  const contentY       = useSharedValue(20)

  useEffect(() => {
    contentOpacity.value = withDelay(100, withTiming(1, { duration: 600 }))
    contentY.value       = withDelay(100, withTiming(0, { duration: 500 }))
    const timer = setTimeout(() => inputRef.current?.focus(), 700)
    return () => clearTimeout(timer)
  }, [])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }))

  const canContinue = name.trim().length >= 2

  const handleContinue = () => {
    Keyboard.dismiss()
    navigation.navigate('EmotionalBaseline')
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AnimatedBackground />

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.content, contentStyle]}>
          {/* Progress */}
          <View style={styles.progressRow}>
            <OnboardingProgress currentStep={1} />
          </View>

          {/* Heading */}
          <View style={styles.headingContainer}>
            <Text style={styles.heading}>{HEADER_TEXT}</Text>
            <Text style={styles.subtext}>{SUBTEXT}</Text>
          </View>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name…"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={canContinue ? handleContinue : undefined}
              maxLength={32}
            />
            <View style={[styles.inputUnderline, canContinue && styles.inputUnderlineActive]} />
          </View>

          {/* Character hint */}
          <Text style={styles.hint}>
            {canContinue ? `Hi, ${name.trim()} ✦` : 'At least 2 characters'}
          </Text>
        </Animated.View>

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <OnboardingButton
            label="Continue →"
            onPress={handleContinue}
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
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.xxl,
  },
  progressRow: {
    alignItems: 'flex-start',
  },
  headingContainer: {
    gap: Spacing.md,
  },
  heading: {
    ...Typography.displayLg,
    color: Colors.white,
  },
  subtext: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  input: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.white,
    paddingVertical: Spacing.sm,
    letterSpacing: -0.5,
  },
  inputUnderline: {
    height: 1.5,
    backgroundColor: Colors.border,
    borderRadius: 1,
  },
  inputUnderlineActive: {
    backgroundColor: Colors.indigo,
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  hint: {
    ...Typography.bodySm,
    color: Colors.textMuted,
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
