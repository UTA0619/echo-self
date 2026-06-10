/**
 * MorningReportScreen
 *
 * Presented as a full-screen modal from the Mirror tab header.
 * Shows the user's personal morning briefing:
 *  - Greeting + date
 *  - Streak ring
 *  - 7-day emotion arc (emoji timeline)
 *  - Yesterday's entry excerpt
 *  - Today's AI insight
 *  - CTA to start journaling
 */
import React, { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MainStackParamList } from '../../navigation/MainStackNavigator'
import { useMorningReport } from '../../hooks/useMorningReport'
import { useAuthStore } from '../../store/auth'
import { Colors, Spacing, BorderRadius } from '../../theme/tokens'
import { HapticPatterns } from '../../theme/haptics'

type Props = NativeStackScreenProps<MainStackParamList, 'MorningReport'>

// ── Emotion → emoji map ───────────────────────────────────────────────────────

const EMOTION_EMOJI: Record<string, string> = {
  joy:          '😊',
  sadness:      '😢',
  anger:        '😠',
  fear:         '😨',
  surprise:     '😲',
  disgust:      '🤢',
  anticipation: '⚡',
  trust:        '🤝',
  optimism:     '🌟',
  love:         '❤️',
  awe:          '✨',
  mixed:        '🌀',
}

const EMOTION_COLOR: Record<string, string> = {
  joy:          '#FBBF24',
  sadness:      '#6366F1',
  anger:        '#EF4444',
  fear:         '#9CA3AF',
  surprise:     '#06B6D4',
  disgust:      '#10B981',
  anticipation: '#F59E0B',
  trust:        '#EC4899',
  optimism:     '#FCD34D',
  love:         '#8B5CF6',
  awe:          '#7B6CF6',
  mixed:        '#8B8FA8',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  })
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StreakRing({ streak, longest }: { streak: number; longest: number }) {
  const scale = useSharedValue(0.7)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value   = withDelay(300, withSpring(1, { damping: 12, stiffness: 120 }))
    opacity.value = withDelay(300, withTiming(1, { duration: 400 }))
  }, [scale, opacity])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }))

  return (
    <Animated.View style={[styles.streakRing, style]}>
      <View style={styles.streakInner}>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>day streak</Text>
      </View>
      <Text style={styles.streakEmoji}>🔥</Text>
      {longest > streak && (
        <Text style={styles.longestLabel}>best: {longest}</Text>
      )}
    </Animated.View>
  )
}

function EmotionArcRow({ arc }: { arc: Array<{ date: string; emotion: string | null; valence: number }> }) {
  return (
    <View style={styles.arcRow}>
      {arc.slice(0, 7).reverse().map((day, i) => {
        const emoji = EMOTION_EMOJI[day.emotion ?? ''] ?? '○'
        const color = EMOTION_COLOR[day.emotion ?? ''] ?? Colors.border1
        const isToday = i === arc.length - 1
        return (
          <Animated.View
            key={day.date}
            entering={FadeInDown.delay(i * 60).duration(300)}
            style={[styles.arcDay, isToday && styles.arcDayToday]}
          >
            <View style={[styles.arcBubble, { borderColor: color + '60', backgroundColor: color + '15' }]}>
              <Text style={styles.arcEmoji}>{emoji}</Text>
            </View>
            <Text style={[styles.arcDate, isToday && { color: Colors.indigo }]}>
              {isToday ? 'today' : new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}
            </Text>
          </Animated.View>
        )
      })}
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function MorningReportScreen({ navigation }: Props) {
  const { user } = useAuthStore()
  const { data, status } = useMorningReport(user?.id)

  const headerY = useSharedValue(-20)
  const headerOpacity = useSharedValue(0)

  useEffect(() => {
    headerY.value       = withTiming(0, { duration: 500 })
    headerOpacity.value = withTiming(1, { duration: 500 })
  }, [headerY, headerOpacity])

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerY.value }],
    opacity:   headerOpacity.value,
  }))

  const handleStartEntry = async () => {
    await HapticPatterns.light()
    navigation.goBack()
    // The DailyMirrorScreen is now visible — focus its input
  }

  const handleDismiss = async () => {
    await HapticPatterns.light()
    navigation.goBack()
  }

  return (
    <View style={styles.root}>
      {/* Background gradient effect */}
      <View style={styles.bgGlow} />

      <SafeAreaView style={styles.safe}>
        {/* Dismiss button */}
        <Pressable
          style={styles.dismissBtn}
          onPress={handleDismiss}
          accessibilityLabel="Close morning report"
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={[styles.header, headerStyle]}>
            <Text style={styles.greeting}>
              {greeting()}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}.
            </Text>
            <Text style={styles.date}>{todayLabel()}</Text>
          </Animated.View>

          {status === 'loading' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.indigo} size="large" />
              <Text style={styles.loadingText}>Preparing your morning briefing…</Text>
            </View>
          )}

          {status === 'success' && data && (
            <>
              {/* Streak */}
              <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.section}>
                <StreakRing streak={data.streak} longest={data.longestStreak} />
              </Animated.View>

              {/* Emotion arc */}
              {data.emotionArc.length > 0 && (
                <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
                  <Text style={styles.sectionLabel}>7-day emotional arc</Text>
                  <EmotionArcRow arc={data.emotionArc} />
                </Animated.View>
              )}

              {/* Morning insight */}
              {data.morningInsight && (
                <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Text style={styles.insightIcon}>✦</Text>
                    <Text style={styles.insightTitle}>ECHO insight</Text>
                  </View>
                  <Text style={styles.insightText}>{data.morningInsight}</Text>
                </Animated.View>
              )}

              {/* Yesterday's entry */}
              {data.yesterdayEntry && (
                <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.yesterdayCard}>
                  <Text style={styles.sectionLabel}>
                    {data.yesterdayEmotion
                      ? `Yesterday — ${EMOTION_EMOJI[data.yesterdayEmotion] ?? ''} ${data.yesterdayEmotion}`
                      : 'Yesterday'}
                  </Text>
                  <Text style={styles.yesterdayText} numberOfLines={5}>
                    {data.yesterdayEntry}
                    {data.yesterdayEntry.length >= 300 ? '…' : ''}
                  </Text>
                </Animated.View>
              )}

              {/* Already journaled today */}
              {data.hasEntryToday && (
                <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.doneBadge}>
                  <Text style={styles.doneBadgeText}>✓ You've journaled today</Text>
                </Animated.View>
              )}
            </>
          )}

          {/* CTA */}
          <Animated.View entering={FadeInDown.delay(550).duration(400)} style={styles.ctaContainer}>
            <Pressable
              style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
              onPress={handleStartEntry}
              accessibilityLabel={data?.hasEntryToday ? 'Continue today\'s entry' : 'Start today\'s entry'}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>
                {data?.hasEntryToday ? 'Continue writing →' : 'Start today\'s entry →'}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const INDIGO = Colors.indigo

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  bgGlow: {
    position:        'absolute',
    top:             -80,
    left:            '50%',
    width:           280,
    height:          280,
    borderRadius:    140,
    backgroundColor: 'rgba(79,70,229,0.08)',
    transform:       [{ translateX: -140 }],
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom:     Spacing.xxxl,
    gap:               Spacing.xl,
  },
  dismissBtn: {
    alignSelf:         'flex-end',
    padding:           Spacing.md,
    marginRight:       Spacing.md,
    marginTop:         Spacing.sm,
  },
  dismissText: {
    fontSize:  18,
    color:     Colors.textSecondary,
    fontWeight: '600',
  },

  // Header
  header: {
    gap: Spacing.xs,
    paddingTop: Spacing.md,
  },
  greeting: {
    fontSize:      30,
    fontWeight:    '700',
    color:         Colors.white,
    letterSpacing: -0.8,
  },
  date: {
    fontSize: 15,
    color:    Colors.textSecondary,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    gap:        Spacing.lg,
    paddingTop: Spacing.xxxl,
  },
  loadingText: {
    fontSize: 14,
    color:    Colors.textSecondary,
  },

  // Section
  section: {
    gap: Spacing.md,
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Streak ring
  streakRing: {
    alignSelf:       'center',
    width:           120,
    height:          120,
    borderRadius:    60,
    borderWidth:     2.5,
    borderColor:     INDIGO + '80',
    backgroundColor: INDIGO + '12',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             2,
  },
  streakInner: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize:      36,
    fontWeight:    '800',
    color:         Colors.white,
    letterSpacing: -1,
    lineHeight:    40,
  },
  streakLabel: {
    fontSize:  11,
    color:     Colors.textSecondary,
    fontWeight: '500',
  },
  streakEmoji: {
    position: 'absolute',
    top:      -6,
    right:    -6,
    fontSize: 22,
  },
  longestLabel: {
    fontSize:  10,
    color:     Colors.textTertiary,
    marginTop: 2,
  },

  // Emotion arc
  arcRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    gap:            4,
  },
  arcDay: {
    flex:       1,
    alignItems: 'center',
    gap:        6,
  },
  arcDayToday: {
    opacity: 1,
  },
  arcBubble: {
    width:        36,
    height:       36,
    borderRadius: 18,
    borderWidth:  1,
    alignItems:   'center',
    justifyContent: 'center',
  },
  arcEmoji: {
    fontSize: 18,
  },
  arcDate: {
    fontSize:  10,
    color:     Colors.textTertiary,
    fontWeight: '500',
  },

  // Insight card
  insightCard: {
    backgroundColor: INDIGO + '10',
    borderRadius:    BorderRadius.lg,
    borderWidth:     1,
    borderColor:     INDIGO + '30',
    padding:         Spacing.lg,
    gap:             Spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  insightIcon: {
    fontSize: 14,
    color:    INDIGO,
  },
  insightTitle: {
    fontSize:      11,
    fontWeight:    '700',
    color:         INDIGO,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  insightText: {
    fontSize:   15,
    color:      Colors.textPrimary,
    lineHeight: 23,
  },

  // Yesterday card
  yesterdayCard: {
    backgroundColor: Colors.surface1,
    borderRadius:    BorderRadius.md,
    borderWidth:     1,
    borderColor:     Colors.border1,
    padding:         Spacing.lg,
    gap:             Spacing.sm,
  },
  yesterdayText: {
    fontSize:   14,
    color:      Colors.textSecondary,
    lineHeight: 22,
    fontStyle:  'italic',
  },

  // Done badge
  doneBadge: {
    alignSelf:       'center',
    backgroundColor: '#22C55E18',
    borderRadius:    BorderRadius.full,
    borderWidth:     1,
    borderColor:     '#22C55E40',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
  },
  doneBadgeText: {
    fontSize:  13,
    color:     '#22C55E',
    fontWeight: '600',
  },

  // CTA
  ctaContainer: {
    marginTop: Spacing.sm,
  },
  ctaButton: {
    backgroundColor: INDIGO,
    borderRadius:    BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems:      'center',
    shadowColor:     INDIGO,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.35,
    shadowRadius:    16,
    elevation:       6,
  },
  ctaButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontSize:      16,
    fontWeight:    '700',
    color:         Colors.white,
    letterSpacing: -0.3,
  },
})
