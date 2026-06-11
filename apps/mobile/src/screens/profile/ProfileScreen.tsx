import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Purchases from 'react-native-purchases';
import { useAuthStore } from '../../store/auth';
import { useOnboardingStore } from '../../store/onboarding';
import { useIAPStore } from '../../store/iap';
import { supabase } from '../../services/supabase';
import { Colors, Spacing } from '../../theme/tokens';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://echo-self.app';

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

// ─── Row item ─────────────────────────────────────────────────────────────────
function Row({
  label,
  value,
  onPress,
  destructive,
  right,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      disabled={!onPress && !right}
      accessibilityLabel={value ? `${label}: ${value}` : label}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityHint={destructive ? 'This action cannot be undone' : undefined}
    >
      <Text style={[styles.rowLabel, destructive && styles.rowDestructive]}>{label}</Text>
      {right ?? (value ? <Text style={styles.rowValue}>{value}</Text> : <Text style={styles.rowChevron}>›</Text>)}
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function ProfileScreen() {
  const { user, signOut, loadProfile } = useAuthStore();
  const { reset: resetOnboarding } = useOnboardingStore();
  const { packages, isPurchasing, purchasePackage, restorePurchases } = useIAPStore();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // (rerender-derived-state-no-effect) derive during render
  const isPremium = useIAPStore((s) => s.isPremium) || user?.subscriptionTier === 'premium';
  // Monthly package for the quick-upgrade CTA; may be undefined before offerings load
  const monthlyPkg = packages.find((p) => p.period === 'monthly');

  // Check notification status on mount
  React.useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifEnabled(status === 'granted');
    });
  }, []);

  async function handleToggleNotifications(value: boolean) {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotifEnabled(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Enable in Settings', 'Open Settings to allow notifications for ECHO.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]);
      }
    } else {
      // Direct to settings to disable — iOS doesn't allow revocation programmatically
      Linking.openSettings();
    }
  }

  async function handleUpgrade() {
    if (!monthlyPkg) {
      // Fallback: no offerings loaded yet (e.g. Simulator)
      Linking.openURL(`${APP_URL}/upgrade`);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await purchasePackage(monthlyPkg);
    if (success && user?.id) {
      await loadProfile(user.id);
    }
  }

  async function handleManageBilling() {
    // Opens the native subscription management sheet (iOS 15+)
    try {
      await Purchases.showManageSubscriptions();
    } catch {
      // Fallback for older OS versions
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    }
  }

  async function handleRestorePurchases() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const restored = await restorePurchases();
    if (restored) {
      if (user?.id) await loadProfile(user.id);
      Alert.alert('Purchases restored', 'Your ECHO Pro subscription is active.');
    } else {
      Alert.alert('Nothing to restore', 'No active subscription found for your Apple ID.');
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          resetOnboarding();
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes all your memories, identity data, and profile. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${APP_URL}/api/account/delete`, { method: 'DELETE' });
              await supabase.auth.signOut();
              resetOnboarding();
            } catch {
              Alert.alert('Error', 'Could not delete account. Please try from the web app.');
            }
          },
        },
      ],
    );
  }

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : '—';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <Animated.View entering={FadeInDown.springify()} style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {(user?.displayName ?? user?.email ?? 'E').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{user?.displayName ?? 'ECHO user'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {isPremium && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>✦ Pro</Text>
            </View>
          )}
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.statsRow}>
          <StatBlock label="Entries" value={user?.totalEntries ?? 0} />
          <StatBlock label="Streak" value={user?.currentStreak ?? 0} suffix="days" />
          <StatBlock label="Best streak" value={user?.longestStreak ?? 0} suffix="days" />
        </Animated.View>

        {/* Subscription */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <Section title="Subscription">
            {isPremium ? (
              <>
                <Row label="Plan" value="ECHO Pro" />
                <Row label="Manage billing" onPress={handleManageBilling} />
              </>
            ) : (
              <>
                <Row label="Plan" value="Free" />
                <Pressable
                  style={[styles.upgradeBtn, isPurchasing && styles.upgradeBtnDisabled]}
                  onPress={handleUpgrade}
                  disabled={isPurchasing}
                  accessibilityLabel={
                    monthlyPkg
                      ? `Upgrade to Pro for ${monthlyPkg.priceString} per month`
                      : 'Upgrade to Pro'
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.upgradeBtnTitle}>
                    {isPurchasing ? 'Processing…' : 'Upgrade to Pro'}
                  </Text>
                  <Text style={styles.upgradeBtnSub}>
                    {monthlyPkg
                      ? `${monthlyPkg.priceString}/mo · Unlimited entries · AI responses · Future Self`
                      : 'Unlimited entries · AI responses · Future Self · $12/mo'}
                  </Text>
                </Pressable>
                <Row label="Restore purchases" onPress={handleRestorePurchases} />
              </>
            )}
          </Section>
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Section title="Notifications">
            <Row
              label="Daily reminder"
              right={
                <Switch
                  value={notifEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: Colors.surface2, true: Colors.indigo }}
                  thumbColor="#fff"
                />
              }
            />
          </Section>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Section title="About">
            <Row label="Member since" value={joinDate} />
            <Row label="Privacy policy" onPress={() => Linking.openURL(`${APP_URL}/privacy`)} />
            <Row label="Terms of service" onPress={() => Linking.openURL(`${APP_URL}/terms`)} />
            <Row label="Version" value="1.0.0" />
          </Section>
        </Animated.View>

        {/* Account actions */}
        <Animated.View entering={FadeInDown.delay(240).springify()}>
          <Section title="Account">
            <Row
              label={signingOut ? 'Signing out…' : 'Sign out'}
              onPress={handleSignOut}
            />
            <Row label="Delete account" onPress={handleDeleteAccount} destructive />
          </Section>
        </Animated.View>

        <Text style={styles.footer}>ECHO — Your Memory Layer</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stat block ───────────────────────────────────────────────────────────────
function StatBlock({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>
        {value.toLocaleString()}
        {suffix && <Text style={styles.statSuffix}> {suffix}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  scroll: { padding: Spacing.md, paddingBottom: 120 },

  profileHeader: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.xs },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.indigo}30`,
    borderWidth: 2,
    borderColor: `${Colors.indigo}60`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarInitial: { fontSize: 32, fontWeight: '700', color: Colors.indigo },
  displayName: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  email: { fontSize: 13, color: Colors.textSecondary },
  proBadge: {
    marginTop: Spacing.xs,
    backgroundColor: `${Colors.indigo}20`,
    borderWidth: 1,
    borderColor: `${Colors.indigo}40`,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  proBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.indigo },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statBlock: {
    flex: 1,
    backgroundColor: Colors.surface1,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border0,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statSuffix: { fontSize: 12, fontWeight: '400', color: Colors.textSecondary },
  statLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },

  section: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionBody: {
    backgroundColor: Colors.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border0,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border0,
  },
  rowPressed: { backgroundColor: Colors.surface2 },
  rowLabel: { fontSize: 15, color: Colors.textPrimary },
  rowDestructive: { color: Colors.error },
  rowValue: { fontSize: 14, color: Colors.textSecondary },
  rowChevron: { fontSize: 20, color: Colors.textTertiary },

  upgradeBtn: {
    margin: Spacing.md,
    backgroundColor: Colors.indigo,
    borderRadius: 12,
    padding: Spacing.md,
  },
  upgradeBtnTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  upgradeBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
  upgradeBtnDisabled: { opacity: 0.5 },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
    letterSpacing: 0.5,
  },
});
