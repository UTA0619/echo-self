// ECHO//SELF — Settings Screen
// Notification preferences, manage subscription, referral code, account actions.
import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  Linking,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { supabase } from '../services/supabase'
import {
  requestNotificationPermission,
  scheduleStreakReminder,
  cancelStreakReminders,
} from '../lib/notifications'
import {
  getOrCreateReferralCode,
  shareReferralLink,
  getReferralStats,
  type ReferralStats,
} from '../lib/referrals'
import { Colors, Spacing, Typography } from '../theme/tokens'

const STRIPE_PORTAL_URL = process.env.EXPO_PUBLIC_STRIPE_PORTAL_URL ?? 'https://echo-self.app/portal'

// ─── Sub-components (hoisted — rerender-no-inline-components) ────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function SettingRow({
  label,
  subtitle,
  right,
  onPress,
  danger,
}: {
  label: string
  subtitle?: string
  right?: React.ReactNode
  onPress?: () => void
  danger?: boolean
}) {
  const content = (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, danger && styles.dangerLabel]}>{label}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      {right !== undefined ? right : onPress ? <Text style={styles.chevron}>›</Text> : null}
    </View>
  )

  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingCard, pressed && styles.settingPressed]}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.settingCard}>{content}</View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function SettingsScreen() {
  const [userId,     setUserId]     = useState<string | null>(null)
  const [tier,       setTier]       = useState<'free' | 'premium'>('free')
  const [notifOn,    setNotifOn]    = useState(false)
  const [notifHour,  setNotifHour]  = useState(20)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null)
  const [loading,    setLoading]    = useState(true)

  // Load current user state
  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted || !user) return

      setUserId(user.id)

      const [profileRes, codeRes, statsRes] = await Promise.all([
        supabase.from('profiles').select('subscription_tier, notification_hour').eq('id', user.id).single(),
        getOrCreateReferralCode(user.id),
        getReferralStats(user.id),
      ])

      if (!mounted) return
      setTier(profileRes.data?.subscription_tier ?? 'free')
      setNotifHour(profileRes.data?.notification_hour ?? 20)
      setReferralCode(codeRes)
      setReferralStats(statsRes)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  const handleNotifToggle = useCallback(async (value: boolean) => {
    setNotifOn(value)
    if (value) {
      const granted = await requestNotificationPermission()
      if (!granted) {
        setNotifOn(false)
        Alert.alert('Permission Required', 'Enable notifications in your device settings.')
        return
      }
      await scheduleStreakReminder(notifHour)
    } else {
      await cancelStreakReminders()
    }
    if (userId) {
      await supabase.from('profiles').update({ notifications_enabled: value }).eq('id', userId)
    }
  }, [userId, notifHour])

  const handleManageSubscription = useCallback(() => {
    Linking.openURL(STRIPE_PORTAL_URL)
  }, [])

  const handleShareReferral = useCallback(() => {
    if (referralCode) shareReferralLink(referralCode)
  }, [referralCode])

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
      ],
    )
  }, [])

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all journal entries. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => Linking.openURL('https://echo-self.app/delete-account'),
        },
      ],
    )
  }, [])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings…</Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <Text style={styles.title}>Settings</Text>
          </Animated.View>

          {/* Subscription */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <SectionHeader title="SUBSCRIPTION" />
            <SettingRow
              label={tier === 'premium' ? 'Echo Premium ✦' : 'Free Plan'}
              subtitle={tier === 'premium' ? 'Active' : 'Upgrade for full access'}
            />
            <SettingRow
              label="Manage Subscription"
              subtitle="Billing, cancellation, and receipts"
              onPress={handleManageSubscription}
            />
          </Animated.View>

          {/* Notifications */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <SectionHeader title="NOTIFICATIONS" />
            <SettingRow
              label="Daily Reflection Reminder"
              subtitle={`Sends at ${notifHour}:00 PM`}
              right={
                <Switch
                  value={notifOn}
                  onValueChange={handleNotifToggle}
                  trackColor={{ false: Colors.border, true: Colors.indigo }}
                  thumbColor={Colors.white}
                />
              }
            />
          </Animated.View>

          {/* Referrals */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <SectionHeader title="REFERRALS" />
            {referralCode ? (
              <>
                <SettingRow
                  label="Your Invite Code"
                  subtitle={referralCode}
                />
                <SettingRow
                  label={`Share Invite Link${referralStats ? ` · ${referralStats.totalReferrals} invited` : ''}`}
                  subtitle="Friends who sign up get 1 month free"
                  onPress={handleShareReferral}
                />
              </>
            ) : null}
          </Animated.View>

          {/* Privacy */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <SectionHeader title="PRIVACY & LEGAL" />
            <SettingRow
              label="Privacy Policy"
              onPress={() => Linking.openURL('https://echo-self.app/privacy')}
            />
            <SettingRow
              label="Terms of Service"
              onPress={() => Linking.openURL('https://echo-self.app/terms')}
            />
            <SettingRow
              label="Export My Data"
              subtitle="Download a copy of all your entries"
              onPress={() => Linking.openURL('https://echo-self.app/export')}
            />
          </Animated.View>

          {/* Account */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <SectionHeader title="ACCOUNT" />
            <SettingRow label="Sign Out" onPress={handleSignOut} />
            <SettingRow
              label="Delete Account"
              onPress={handleDeleteAccount}
              danger
            />
          </Animated.View>

          {/* App version */}
          <Text style={styles.version}>ECHO//SELF · v0.1.0</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.textMuted,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  sectionHeader: {
    ...Typography.caption,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  settingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 2,
  },
  settingPressed: {
    opacity: 0.7,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    ...Typography.bodyMd,
    color: Colors.textPrimary,
  },
  dangerLabel: {
    color: Colors.rose,
  },
  settingSubtitle: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textMuted,
    marginRight: Spacing.xs,
  },
  version: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
})
