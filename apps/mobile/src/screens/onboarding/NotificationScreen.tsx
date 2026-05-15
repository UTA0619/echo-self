// ECHO//SELF — Screen 4/5: Notification Permissions
import React, { useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import * as Notifications from 'expo-notifications'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator'
import { AnimatedBackground } from '../../components/onboarding/AnimatedBackground'
import { OnboardingButton } from '../../components/onboarding/OnboardingButton'
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress'
import { useOnboardingStore } from '../../store/onboarding'
import { Colors, Spacing, Typography } from '../../theme/tokens'
import { HapticPatterns } from '../../theme/haptics'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Notifications'>

// Hoisted static data (rendering-hoist-jsx)
const BENEFITS = [
  { icon: '🌅', text: 'Daily reflection prompts at your ideal time' },
  { icon: '🔥', text: 'Streak reminders to keep momentum' },
  { icon: '✦',  text: 'Echo insights when patterns emerge' },
]

export function NotificationScreen({ navigation }: Props) {
  const { setNotificationsEnabled } = useOnboardingStore()

  const contentOpacity = useSharedValue(0)
  const contentY       = useSharedValue(20)
  const bellScale      = useSharedValue(0.6)
  const bellOpacity    = useSharedValue(0)

  useEffect(() => {
    contentOpacity.value = withDelay(100, withTiming(1, { duration: 600 }))
    contentY.value       = withDelay(100, withTiming(0, { duration: 500 }))
    bellScale.value      = withDelay(300, withSpring(1, { damping: 12, stiffness: 120 }))
    bellOpacity.value    = withDelay(300, withTiming(1, { duration: 400 }))
  }, [])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }))

  const bellStyle = useAnimatedStyle(() => ({
    opacity: bellOpacity.value,
    transform: [{ scale: bellScale.value }],
  }))

  const requestAndContinue = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync()
      const granted = status === 'granted'
      setNotificationsEnabled(granted)
      if (granted) await HapticPatterns.success()
    } catch {
      setNotificationsEnabled(false)
    }
    navigation.navigate('Paywall')
  }

  const skipNotifications = () => {
    setNotificationsEnabled(false)
    navigation.navigate('Paywall')
  }

  return (
    <View style={styles.root}>
      <AnimatedBackground />

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.content, contentStyle]}>
          <OnboardingProgress currentStep={3} />

          {/* Bell illustration */}
          <Animated.View style={[styles.bellContainer, bellStyle]}>
            <View style={styles.bellRing}>
              <Text style={styles.bellEmoji}>🔔</Text>
            </View>
          </Animated.View>

          {/* Heading */}
          <View style={styles.headingContainer}>
            <Text style={styles.heading}>Stay in sync{'\n'}with yourself</Text>
            <Text style={styles.subtext}>
              Echo sends gentle nudges when it's time to reflect. No spam — just the right prompt at the right moment.
            </Text>
          </View>

          {/* Benefits list */}
          <View style={styles.benefits}>
            {BENEFITS.map((benefit, i) => (
              <View key={i} style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* CTAs */}
        <Animated.View style={[styles.ctaContainer, contentStyle]}>
          <OnboardingButton
            label="Enable Notifications"
            onPress={requestAndContinue}
            style={styles.cta}
          />
          <OnboardingButton
            label="Maybe later →"
            onPress={skipNotifications}
            variant="ghost"
          />
        </Animated.View>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.xxl,
  },
  bellContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  bellRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(79,70,229,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(79,70,229,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  bellEmoji: {
    fontSize: 44,
  },
  headingContainer: {
    gap: Spacing.md,
  },
  heading: {
    ...Typography.displayMd,
    color: Colors.white,
  },
  subtext: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  benefits: {
    gap: Spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  benefitIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  benefitText: {
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 22,
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
