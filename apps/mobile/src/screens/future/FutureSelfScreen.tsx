// ECHO//SELF — Future Self Screen
// Displays the 3 prediction timeframes (30d / 90d / 1yr) with PersonaCard reveal,
// TraitShiftRow breakdown, and share functionality.
import React, { useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Share,
  RefreshControl,
} from 'react-native'
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { useFutureSelfStore } from '../../store/futureSelf'
import { useAuthStore } from '../../store/auth'
import { PersonaCard } from '../../components/future/PersonaCard'
import { TraitShiftRow } from '../../components/future/TraitShiftRow'
import { OnboardingButton } from '../../components/onboarding/OnboardingButton'
import { Colors, Spacing, Typography } from '../../theme/tokens'

// Static strings — hoisted (rendering-hoist-jsx)
const LOADING_TEXT   = 'Echo is studying your patterns…'
const IDLE_TITLE     = 'Your future self awaits'
const IDLE_BODY      = 'Write at least 5 journal entries so Echo can build your first prediction.'
const ERROR_PREFIX   = 'Something went wrong: '

function LoadingState() {
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 })
    const id = setInterval(() => {
      opacity.value = withTiming(opacity.value < 0.8 ? 1 : 0.4, { duration: 600 })
    }, 800)
    return () => clearInterval(id)
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <View style={styles.centeredState}>
      <Text style={styles.loadingGlyph}>◈</Text>
      <Animated.Text style={[styles.loadingText, style]}>{LOADING_TEXT}</Animated.Text>
    </View>
  )
}

function IdleState({ onGenerate, isLoading }: { onGenerate: () => void; isLoading: boolean }) {
  return (
    <View style={styles.centeredState}>
      <Text style={styles.idleGlyph}>🔮</Text>
      <Text style={styles.idleTitle}>{IDLE_TITLE}</Text>
      <Text style={styles.idleBody}>{IDLE_BODY}</Text>
      <OnboardingButton
        label={isLoading ? 'Generating…' : 'Generate Prediction'}
        onPress={onGenerate}
        disabled={isLoading}
        style={styles.generateBtn}
      />
    </View>
  )
}

export function FutureSelfScreen() {
  const { user } = useAuthStore()
  const {
    prediction,
    predictionState,
    isRevealed,
    errorMessage,
    loadPrediction,
    generatePrediction,
    setRevealed,
  } = useFutureSelfStore()

  const [refreshing, setRefreshing] = React.useState(false)

  useEffect(() => {
    if (user?.id) loadPrediction(user.id)
  }, [user?.id])

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return
    setRefreshing(true)
    await loadPrediction(user.id)
    setRefreshing(false)
  }, [user?.id])

  const handleGenerate = useCallback(() => {
    if (user?.id) generatePrediction(user.id)
  }, [user?.id])

  const handleShare = useCallback(async () => {
    if (!prediction) return
    const text = prediction.keyTraitShifts.slice(0, 2)
      .map((t) => `${t.trait}: ${t.from} → ${t.to}`)
      .join('\n')
    await Share.share({
      message: `My Future Self (via ECHO//SELF):\n\n"${prediction.personaName}"\n\n${text}\n\nhttps://echo-self.app`,
    })
  }, [prediction])

  const isLoading = predictionState === 'loading'

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.indigo}
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <Text style={styles.headerTitle}>Future Self</Text>
            <Text style={styles.headerSub}>Who you're becoming</Text>
          </Animated.View>

          {/* States */}
          {predictionState === 'loading' && !prediction ? (
            <LoadingState />
          ) : predictionState === 'error' ? (
            <View style={styles.centeredState}>
              <Text style={styles.errorText}>
                {ERROR_PREFIX}{errorMessage ?? 'Unknown error'}
              </Text>
              <OnboardingButton
                label="Retry"
                onPress={handleGenerate}
                variant="secondary"
              />
            </View>
          ) : prediction ? (
            <>
              {/* Persona card with reveal mechanic */}
              <Animated.View entering={FadeInDown.delay(100).duration(600)}>
                <PersonaCard
                  prediction={prediction}
                  isRevealed={isRevealed}
                  onReveal={() => setRevealed(true)}
                />
              </Animated.View>

              {/* Trait shifts */}
              {isRevealed && prediction.keyTraitShifts.length > 0 && (
                <Animated.View
                  entering={FadeInDown.delay(300).duration(500)}
                  style={styles.traitsSection}
                >
                  <Text style={styles.sectionTitle}>KEY SHIFTS</Text>
                  {prediction.keyTraitShifts.map((shift, i) => (
                    <TraitShiftRow key={i} shift={shift} index={i} />
                  ))}
                </Animated.View>
              )}

              {/* Metadata row */}
              {isRevealed && (
                <Animated.View
                  entering={FadeInDown.delay(500).duration(400)}
                  style={styles.metaRow}
                >
                  <View style={styles.metaItem}>
                    <Text style={styles.metaValue}>
                      {Math.round(prediction.confidenceScore * 100)}%
                    </Text>
                    <Text style={styles.metaLabel}>confidence</Text>
                  </View>
                  <View style={styles.metaSep} />
                  <View style={styles.metaItem}>
                    <Text style={styles.metaValue}>{prediction.entryCount}</Text>
                    <Text style={styles.metaLabel}>entries analyzed</Text>
                  </View>
                  <View style={styles.metaSep} />
                  <View style={styles.metaItem}>
                    <Text style={styles.metaValue}>{prediction.timeHorizon}</Text>
                    <Text style={styles.metaLabel}>horizon</Text>
                  </View>
                </Animated.View>
              )}

              {/* Actions */}
              {isRevealed && (
                <Animated.View
                  entering={FadeInDown.delay(600).duration(400)}
                  style={styles.actions}
                >
                  <OnboardingButton
                    label="↗ Share Prediction"
                    onPress={handleShare}
                    variant="secondary"
                    style={styles.actionBtn}
                  />
                  <OnboardingButton
                    label="↺ Regenerate"
                    onPress={handleGenerate}
                    variant="ghost"
                    disabled={isLoading}
                  />
                </Animated.View>
              )}
            </>
          ) : (
            <IdleState onGenerate={handleGenerate} isLoading={isLoading} />
          )}

          <View style={styles.bottomPad} />
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
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
  },
  header: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.silver,
    opacity: 0.6,
  },
  centeredState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.lg,
  },
  loadingGlyph: {
    fontSize: 56,
    color: Colors.indigo,
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  idleGlyph: {
    fontSize: 64,
  },
  idleTitle: {
    ...Typography.headingLg,
    color: Colors.white,
    textAlign: 'center',
  },
  idleBody: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  generateBtn: {
    minWidth: 200,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.rose,
    textAlign: 'center',
    lineHeight: 24,
  },
  traitsSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metaItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaSep: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  metaValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  metaLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actions: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  actionBtn: {
    width: '100%',
  },
  bottomPad: {
    height: 100,
  },
})
