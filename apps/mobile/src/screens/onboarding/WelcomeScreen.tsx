// ECHO//SELF — Screen 1/5: Welcome
import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions, SafeAreaView } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator'
import { AnimatedBackground } from '../../components/onboarding/AnimatedBackground'
import { OnboardingButton } from '../../components/onboarding/OnboardingButton'
import { Colors, Spacing, Typography } from '../../theme/tokens'

const { width } = Dimensions.get('window')

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>

export function WelcomeScreen({ navigation }: Props) {
  const logoOpacity   = useSharedValue(0)
  const logoScale     = useSharedValue(0.8)
  const taglineOpacity = useSharedValue(0)
  const subtitleOpacity = useSharedValue(0)
  const ctaOpacity    = useSharedValue(0)

  useEffect(() => {
    logoOpacity.value   = withDelay(200, withTiming(1, { duration: 900, easing: Easing.out(Easing.exp) }))
    logoScale.value     = withDelay(200, withSpring(1, { damping: 14, stiffness: 120 }))
    taglineOpacity.value = withDelay(700, withTiming(1, { duration: 700 }))
    subtitleOpacity.value = withDelay(1100, withTiming(1, { duration: 700 }))
    ctaOpacity.value    = withDelay(1500, withTiming(1, { duration: 600 }))
  }, [])

  const logoStyle     = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ scale: logoScale.value }] }))
  const taglineStyle  = useAnimatedStyle(() => ({ opacity: taglineOpacity.value, transform: [{ translateY: (1 - taglineOpacity.value) * 12 }] }))
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value, transform: [{ translateY: (1 - subtitleOpacity.value) * 8 }] }))
  const ctaStyle      = useAnimatedStyle(() => ({ opacity: ctaOpacity.value, transform: [{ translateY: (1 - ctaOpacity.value) * 16 }] }))

  return (
    <View style={styles.root}>
      <AnimatedBackground />

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          {/* Logo mark */}
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Text style={styles.logoGlyph}>◈</Text>
              </View>
            </View>
          </Animated.View>

          {/* Wordmark */}
          <Animated.View style={[styles.wordmarkRow, logoStyle]}>
            <Text style={styles.wordmark}>ECHO</Text>
            <Text style={styles.wordmarkSlash}>//</Text>
            <Text style={styles.wordmarkSelf}>SELF</Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.Text style={[styles.tagline, taglineStyle]}>
            Meet your future self.
          </Animated.Text>

          {/* Subtitle */}
          <Animated.Text style={[styles.subtitle, subtitleStyle]}>
            An AI that learns your emotional patterns,{'\n'}predicts who you're becoming, and helps{'\n'}you get there faster.
          </Animated.Text>
        </View>

        {/* CTA */}
        <Animated.View style={[styles.ctaContainer, ctaStyle]}>
          <OnboardingButton
            label="Begin →"
            onPress={() => navigation.navigate('Name')}
            style={styles.cta}
          />
          <Text style={styles.disclaimer}>No account needed to start</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  logoContainer: {
    marginBottom: Spacing.sm,
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(79,70,229,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(79,70,229,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlyph: {
    fontSize: 32,
    color: Colors.indigo,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  wordmark: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1.5,
  },
  wordmarkSlash: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.indigo,
    letterSpacing: 0,
  },
  wordmarkSelf: {
    fontSize: 38,
    fontWeight: '300',
    color: Colors.silver,
    letterSpacing: -1,
  },
  tagline: {
    ...Typography.displayMd,
    color: Colors.white,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: width * 0.8,
  },
  ctaContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  cta: {
    width: '100%',
  },
  disclaimer: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
})
