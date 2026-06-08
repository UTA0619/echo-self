// ECHO//SELF — Screen 5/5: Paywall (StoreKit / Apple IAP via RevenueCat)
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { OnboardingParamList } from '../../navigation/OnboardingNavigator'
import { AnimatedBackground } from '../../components/onboarding/AnimatedBackground'
import { OnboardingButton } from '../../components/onboarding/OnboardingButton'
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress'
import { useOnboardingStore } from '../../store/onboarding'
import { useIAPStore, type IAPPackage } from '../../store/iap'
import { useAuthStore } from '../../store/auth'
import { Colors, Spacing, Typography } from '../../theme/tokens'
import { HapticPatterns } from '../../theme/haptics'

type Props = NativeStackScreenProps<OnboardingParamList, 'Paywall'>

// ─── Static content ───────────────────────────────────────────────────────────

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

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://echo-self.app'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function periodLabel(pkg: IAPPackage): string {
  if (pkg.period === 'annual') return '/year'
  return '/month'
}

function savingsLabel(packages: IAPPackage[]): string | null {
  const monthly = packages.find((p) => p.period === 'monthly')
  const annual  = packages.find((p) => p.period === 'annual')
  if (!monthly || !annual) return null

  // Parse numeric prices
  const monthlyNum = parseFloat(monthly.priceString.replace(/[^0-9.]/g, ''))
  const annualNum  = parseFloat(annual.priceString.replace(/[^0-9.]/g, ''))
  if (!monthlyNum || !annualNum) return null

  const savings = Math.round((1 - annualNum / (monthlyNum * 12)) * 100)
  return savings > 0 ? `Save ${savings}%` : null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaywallScreen({ navigation: _navigation }: Props) {
  const { completeOnboarding, complete } = useOnboardingStore()
  const { user, loadProfile } = useAuthStore()
  const {
    packages,
    isLoading,
    isPurchasing,
    error,
    purchasePackage,
    restorePurchases,
    fetchOfferings,
  } = useIAPStore()

  // Which package identifier the user has selected — undefined = use first available
  // (rerender-derived-state-no-effect: derive selectedPkg during render, not in useEffect)
  const [selectedIdentifier, setSelectedIdentifier] = useState<string | undefined>(undefined)
  const selectedPkg: IAPPackage | null =
    packages.find((p) => p.identifier === selectedIdentifier) ?? packages[0] ?? null

  // Animation values
  const contentOpacity = useSharedValue(0)
  const contentY       = useSharedValue(24)
  const cardScale      = useSharedValue(0.92)

  useEffect(() => {
    contentOpacity.value = withDelay(150, withTiming(1, { duration: 600 }))
    contentY.value       = withDelay(150, withTiming(0, { duration: 500 }))
    cardScale.value      = withDelay(400, withSpring(1, { damping: 14, stiffness: 120 }))
  }, [contentOpacity, contentY, cardScale])

  // Retry fetching offerings if empty (edge case: RevenueCat not yet configured)
  useEffect(() => {
    if (packages.length === 0 && !isLoading) {
      fetchOfferings()
    }
  }, [packages, isLoading, fetchOfferings])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }))

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }))

  // ── Handlers ────────────────────────────────────────────────────────────────

  const finishOnboarding = async () => {
    if (user?.id) {
      await completeOnboarding(user.id)
    } else {
      // Fallback: no user id yet (edge case) — just mark complete locally
      complete()
    }
  }

  const handlePurchase = async () => {
    if (!selectedPkg || isPurchasing) return
    await HapticPatterns.light()

    const success = await purchasePackage(selectedPkg)
    if (success) {
      await HapticPatterns.success()
      // Refresh auth profile so isPremium flag updates everywhere
      if (user?.id) await loadProfile(user.id)
      await finishOnboarding()
    } else if (error) {
      Alert.alert('Purchase failed', error)
    }
    // If !success && !error → user cancelled (silent)
  }

  const handleRestore = async () => {
    await HapticPatterns.light()
    const restored = await restorePurchases()
    if (restored) {
      await HapticPatterns.success()
      if (user?.id) await loadProfile(user.id)
      Alert.alert('Purchases restored!', 'Your ECHO Pro subscription is active.', [
        { text: 'Continue', onPress: finishOnboarding },
      ])
    } else {
      Alert.alert(
        'No active subscription found',
        'If you believe this is an error, contact support@echo-self.app',
      )
    }
  }

  const handleFreePlan = async () => {
    await finishOnboarding()
  }

  const savings = savingsLabel(packages)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <AnimatedBackground />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[styles.header, contentStyle]}>
            <OnboardingProgress currentStep={4} />
            <Text style={styles.heading}>Unlock your{'\n'}full potential</Text>
            <Text style={styles.subtext}>
              Start free. Upgrade when you're ready to go deeper.
            </Text>
          </Animated.View>

          {/* Package selector */}
          {isLoading ? (
            <Animated.View style={[styles.loadingCard, cardStyle]}>
              <ActivityIndicator color={Colors.indigo} size="large" />
              <Text style={styles.loadingText}>Loading plans…</Text>
            </Animated.View>
          ) : packages.length > 0 ? (
            <Animated.View style={[styles.packagesCard, cardStyle]}>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>ECHO PRO</Text>
              </View>

              {/* Feature list */}
              <View style={styles.featureList}>
                {PREMIUM_FEATURES.map((feat) => (
                  <View key={feat} style={styles.featureRow}>
                    <Text style={styles.checkmark}>✦</Text>
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>

              {/* Package toggle */}
              <View style={styles.packageToggle}>
                {packages.map((pkg) => {
                  const isSelected = selectedPkg?.identifier === pkg.identifier
                  return (
                    <Pressable
                      key={pkg.identifier}
                      style={[styles.pkgOption, isSelected && styles.pkgOptionSelected]}
                      onPress={() => {
                        HapticPatterns.light()
                        setSelectedIdentifier(pkg.identifier)
                      }}
                      accessibilityLabel={`${pkg.period === 'annual' ? 'Annual' : 'Monthly'} plan, ${pkg.priceString}${periodLabel(pkg)}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={styles.pkgTop}>
                        <Text style={[styles.pkgPeriod, isSelected && styles.pkgPeriodSelected]}>
                          {pkg.period === 'annual' ? 'Annual' : 'Monthly'}
                        </Text>
                        {pkg.period === 'annual' && savings && (
                          <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>{savings}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.pkgPrice, isSelected && styles.pkgPriceSelected]}>
                        {pkg.priceString}
                      </Text>
                      <Text style={[styles.pkgPer, isSelected && styles.pkgPerSelected]}>
                        {periodLabel(pkg)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </Animated.View>
          ) : (
            // Fallback if offerings unavailable (e.g. Simulator / no RC key)
            <Animated.View style={[styles.packagesCard, cardStyle]}>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>ECHO PRO — $12/month</Text>
              </View>
              <View style={styles.featureList}>
                {PREMIUM_FEATURES.map((feat) => (
                  <View key={feat} style={styles.featureRow}>
                    <Text style={styles.checkmark}>✦</Text>
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Free plan card */}
          <Animated.View style={[styles.freeCard, contentStyle]}>
            <Text style={styles.freePlanName}>Free Plan</Text>
            <View style={styles.featureList}>
              {FREE_FEATURES.map((feat) => (
                <View key={feat} style={styles.featureRow}>
                  <Text style={styles.bullet}>·</Text>
                  <Text style={styles.freeFeatureText}>{feat}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* CTAs */}
          <Animated.View style={[styles.ctaContainer, contentStyle]}>
            {/* Primary — native StoreKit purchase */}
            <OnboardingButton
              label={
                isPurchasing
                  ? 'Processing…'
                  : selectedPkg
                    ? `Start Pro — ${selectedPkg.priceString}${periodLabel(selectedPkg)}`
                    : 'Start Pro'
              }
              onPress={handlePurchase}
              disabled={isPurchasing || (!selectedPkg && packages.length > 0)}
              style={styles.cta}
              accessibilityLabel={
                selectedPkg
                  ? `Subscribe to ECHO Pro for ${selectedPkg.priceString}${periodLabel(selectedPkg)}`
                  : 'Subscribe to ECHO Pro'
              }
            />

            {/* Continue free */}
            <OnboardingButton
              label="Continue with Free"
              onPress={handleFreePlan}
              variant="secondary"
              style={styles.cta}
              accessibilityLabel="Continue with the free plan"
            />

            {/* Restore purchases — REQUIRED by Apple guideline 3.1.1 */}
            <Pressable
              onPress={handleRestore}
              style={styles.restoreBtn}
              accessibilityLabel="Restore previous purchases"
              accessibilityRole="button"
            >
              <Text style={styles.restoreText}>Restore purchases</Text>
            </Pressable>

            {/* Legal */}
            <Text style={styles.legalText}>
              {'Payment will be charged to your Apple ID account at confirmation of purchase. '}
              {'Subscription automatically renews unless auto-renew is turned off at least 24 hours '}
              {'before the end of the current period. You can manage or turn off auto-renew in '}
              {'your Account Settings at any time.\n\n'}
              {'By continuing you agree to our '}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL(`${APP_URL}/terms`)}
                accessibilityLabel="Terms of Service"
                accessibilityRole="link"
              >
                Terms
              </Text>
              {' & '}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL(`${APP_URL}/privacy`)}
                accessibilityLabel="Privacy Policy"
                accessibilityRole="link"
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },

  // Header
  header: { gap: Spacing.md },
  heading: { ...Typography.displayMd, color: Colors.white, marginTop: Spacing.lg },
  subtext: { ...Typography.bodyMd, color: Colors.textSecondary, lineHeight: 24 },

  // Loading
  loadingCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.indigo,
  },
  loadingText: { ...Typography.bodyMd, color: Colors.textSecondary },

  // Packages card
  packagesCard: {
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

  // Features
  featureList: { padding: Spacing.xl, gap: Spacing.md },
  featureRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  checkmark: { color: Colors.indigo, fontSize: 14, marginTop: 2, width: 16 },
  featureText: { ...Typography.bodyMd, color: Colors.textPrimary, flex: 1, lineHeight: 22 },

  // Package toggle
  packageToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  pkgOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    gap: 2,
  },
  pkgOptionSelected: {
    borderColor: Colors.indigo,
    backgroundColor: 'rgba(123,108,246,0.12)',
  },
  pkgTop: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pkgPeriod: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  pkgPeriodSelected: { color: Colors.indigo },
  pkgPrice: { fontSize: 20, fontWeight: '800', color: Colors.textSecondary, letterSpacing: -0.5 },
  pkgPriceSelected: { color: Colors.white },
  pkgPer: { ...Typography.caption, color: Colors.textMuted },
  pkgPerSelected: { color: Colors.textSecondary },

  // Savings badge
  savingsBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  savingsText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Free plan
  freeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  freePlanName: { ...Typography.headingMd, color: Colors.textSecondary },
  bullet: { color: Colors.textMuted, fontSize: 18, width: 16, marginTop: -2 },
  freeFeatureText: { ...Typography.bodyMd, color: Colors.textSecondary, flex: 1, lineHeight: 22 },

  // CTAs
  ctaContainer: { gap: Spacing.sm, alignItems: 'center' },
  cta: { width: '100%' },

  restoreBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  restoreText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },

  legalText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  legalLink: { color: Colors.indigo, textDecorationLine: 'underline' },
})
