// ECHO//SELF — Screen 5/5: Paywall / Plan Selection
import React, { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator'
import { AnimatedBackground } from '../../components/onboarding/AnimatedBackground'
import { OnboardingButton } from '../../components/onboarding/OnboardingButton'
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress'
import { useOnboardingStore } from '../../store/onboarding'
import { Colors, Spacing, Typography } from '../../theme/tokens'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Paywall'>

// Hoisted static data (rendering-hoist-jsx)
const FREE_FEATURES = [
  '7 journal entries / month',
  'Basic emotion tracking',
  '30-day memory window',
]

const PREMIUM_FEATURES = [
  'Unlimited journal entries',
  'Full emotion arc + insights',
  'Unlimited memory timeline',
  'Future Self predictions (30d / 90d / 1yr)',
  'Identity graph evolution',
  'Priority AI responses',
]

const STRIPE_CHECKOUT_URL = process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL ?? 'https://echo-self.app/upgrade'

export function PaywallScreen({ navigation: _navigation }: Props) {
  const { completeOnboarding } = useOnboardingStore()

  const contentOpacity  = useSharedValue(0)
  const contentY        = useSharedValue(24)
  const cardScale       = useSharedValue(0.92)

  useEffect(() => {
    contentOpacity.value = withDelay(150, withTiming(1, { duration: 600 }))
    contentY.value       = withDelay(150, withTiming(0, { duration: 500 }))
    cardScale.value      = withDelay(400, withSpring(1, { damping: 14, stiffness: 120 }))
  }, [])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }))

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }))

  const handleUpgrade = async () => {
    try {
      await Linking.openURL(STRIPE_CHECKOUT_URL)
    } catch {
      // Silently fail — user stays on screen
    }
    completeOnboarding()
  }

  const handleFreePlan = () => {
    completeOnboarding()
  }

  return (
    <View style={styles.root}>
      <AnimatedBackground />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, contentStyle]}>
            <OnboardingProgress currentStep={4} />
            <Text style={styles.heading}>Unlock your{'\n'}full potential</Text>
            <Text style={styles.subtext}>
              Start free. Upgrade when you're ready to go deeper.
            </Text>
          </Animated.View>

          {/* Premium plan card */}
          <Animated.View style={[styles.premiumCard, cardStyle]}>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>RECOMMENDED</Text>
            </View>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Echo Premium</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>$9</Text>
                <Text style={styles.pricePer}>/month</Text>
              </View>
              <Text style={styles.priceSub}>Cancel anytime</Text>
            </View>
            <View style={styles.featureList}>
              {PREMIUM_FEATURES.map((feat, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.checkmark}>✦</Text>
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Free plan card */}
          <Animated.View style={[styles.freeCard, contentStyle]}>
            <Text style={styles.freePlanName}>Free Plan</Text>
            <View style={styles.featureList}>
              {FREE_FEATURES.map((feat, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.bullet}>·</Text>
                  <Text style={styles.freeFeatureText}>{feat}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* CTAs */}
          <Animated.View style={[styles.ctaContainer, contentStyle]}>
            <OnboardingButton
              label="Start Premium — $9/mo"
              onPress={handleUpgrade}
              style={styles.cta}
            />
            <OnboardingButton
              label="Continue with Free"
              onPress={handleFreePlan}
              variant="secondary"
              style={styles.cta}
            />
            <Text style={styles.legalText}>
              By continuing you agree to our{' '}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL('https://echo-self.app/terms')}
              >
                Terms
              </Text>
              {' & '}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL('https://echo-self.app/privacy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
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
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  header: {
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
  premiumCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.indigo,
    overflow: 'hidden',
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  premiumBadge: {
    backgroundColor: Colors.indigo,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  premiumBadgeText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  planHeader: {
    padding: Spacing.xl,
    gap: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  planName: {
    ...Typography.headingLg,
    color: Colors.white,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  price: {
    fontSize: 44,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -2,
  },
  pricePer: {
    ...Typography.headingMd,
    color: Colors.textSecondary,
  },
  priceSub: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  freeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  freePlanName: {
    ...Typography.headingMd,
    color: Colors.textSecondary,
  },
  featureList: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  checkmark: {
    color: Colors.indigo,
    fontSize: 14,
    marginTop: 2,
    width: 16,
  },
  bullet: {
    color: Colors.textMuted,
    fontSize: 18,
    width: 16,
    marginTop: -2,
  },
  featureText: {
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  freeFeatureText: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  ctaContainer: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  cta: {
    width: '100%',
  },
  legalText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  legalLink: {
    color: Colors.indigo,
    textDecorationLine: 'underline',
  },
})
