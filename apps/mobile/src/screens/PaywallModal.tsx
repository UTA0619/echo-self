// ECHO//SELF — Paywall Modal
// Full-screen blur overlay comparing Free vs Premium plans with Stripe Checkout CTA.
// Mount over any screen when a user hits a pro-gated feature.
import React, { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Linking,
  ScrollView,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { Colors, Spacing, Typography } from '../theme/tokens'

const { height: SCREEN_H } = Dimensions.get('window')
const STRIPE_URL = process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL ?? 'https://echo-self.app/upgrade'

// Hoisted static data (rendering-hoist-jsx)
const PREMIUM_FEATURES = [
  { icon: '✦', text: 'Future Self predictions (30d / 90d / 1yr)' },
  { icon: '🧠', text: 'Identity graph & pattern tracking' },
  { icon: '∞', text: 'Unlimited journal entries' },
  { icon: '◈', text: 'Deep memory timeline (all time)' },
  { icon: '⚡', text: 'Priority AI responses' },
  { icon: '🌐', text: 'Share your prediction card' },
]

const FREE_LIMITS = [
  '7 entries / month',
  '30-day memory window',
  'Basic emotion tracking only',
]

interface Props {
  trigger?: string          // feature name that triggered this modal
  onDismiss: () => void
}

// Separated so it doesn't re-render when parent state changes (rerender-no-inline-components)
function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  )
}

function LimitRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.limitIcon}>·</Text>
      <Text style={styles.limitText}>{text}</Text>
    </View>
  )
}

export function PaywallModal({ trigger, onDismiss }: Props) {
  const sheetY    = useSharedValue(SCREEN_H)
  const bgOpacity = useSharedValue(0)

  useEffect(() => {
    bgOpacity.value = withTiming(1, { duration: 300 })
    sheetY.value    = withSpring(0, { damping: 20, stiffness: 200 })
  }, [])

  const dismiss = () => {
    bgOpacity.value = withTiming(0, { duration: 200 })
    sheetY.value    = withTiming(SCREEN_H, { duration: 300, easing: Easing.in(Easing.quad) }, () => {
      // Dismissed
    })
    onDismiss()
  }

  const bgStyle    = useAnimatedStyle(() => ({ opacity: bgOpacity.value }))
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }))

  const handleUpgrade = async () => {
    try {
      await Linking.openURL(STRIPE_URL)
    } catch {
      // Silently fail
    }
    dismiss()
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFillObject} onPress={dismiss}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
        </Pressable>
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]} pointerEvents="auto">
        {/* Handle */}
        <View style={styles.handle} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.sheetEmoji}>🔮</Text>
            <Text style={styles.sheetTitle}>
              {trigger ? `Unlock ${trigger}` : 'Unlock Echo Premium'}
            </Text>
            <Text style={styles.sheetSub}>
              Go deeper with your future self predictions and unlimited access.
            </Text>
          </View>

          {/* Premium features */}
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Echo Premium</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>$9</Text>
                <Text style={styles.pricePer}>/mo</Text>
              </View>
            </View>
            <View style={styles.featureList}>
              {PREMIUM_FEATURES.map((f, i) => (
                <FeatureRow key={i} icon={f.icon} text={f.text} />
              ))}
            </View>
          </View>

          {/* Free plan comparison */}
          <View style={styles.freeCard}>
            <Text style={styles.freePlanLabel}>Free Plan limits:</Text>
            <View style={styles.featureList}>
              {FREE_LIMITS.map((t, i) => (
                <LimitRow key={i} text={t} />
              ))}
            </View>
          </View>

          {/* Legal */}
          <Text style={styles.legal}>
            Billed monthly. Cancel anytime in{' '}
            {Platform.OS === 'ios' ? 'App Store Settings' : 'Google Play'}.
          </Text>
        </ScrollView>

        {/* Sticky CTAs */}
        <View style={styles.ctaSection}>
          <Pressable style={styles.upgradeCta} onPress={handleUpgrade}>
            <Text style={styles.upgradeCtaText}>Start Premium — $9/mo</Text>
          </Pressable>
          <Pressable style={styles.dismissCta} onPress={dismiss}>
            <Text style={styles.dismissCtaText}>Maybe later</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_H * 0.92,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  headerSection: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  sheetEmoji: { fontSize: 48 },
  sheetTitle: {
    ...Typography.displayMd,
    color: Colors.white,
    textAlign: 'center',
  },
  sheetSub: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.indigo,
    overflow: 'hidden',
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  planHeader: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  planName: {
    ...Typography.headingMd,
    color: Colors.white,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
  },
  pricePer: {
    ...Typography.headingMd,
    color: Colors.textSecondary,
  },
  featureList: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
    color: Colors.indigo,
  },
  featureText: {
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
  },
  freeCard: {
    backgroundColor: Colors.black,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  freePlanLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  limitIcon: {
    color: Colors.textMuted,
    fontSize: 20,
    width: 24,
    textAlign: 'center',
    marginTop: -4,
  },
  limitText: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    flex: 1,
  },
  legal: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  ctaSection: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  upgradeCta: {
    backgroundColor: Colors.indigo,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  upgradeCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  dismissCta: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  dismissCtaText: {
    ...Typography.bodyMd,
    color: Colors.textMuted,
  },
})
