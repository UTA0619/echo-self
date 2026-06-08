/**
 * VoiceConversationScreen — Fullscreen Tap-to-Converse UI
 *
 * A dedicated conversational mode where users speak with ECHO.
 * Each voice turn is transcribed via Whisper, submitted to echo-ai,
 * and the response is displayed as a text bubble.
 *
 * Flow:
 *   1. User holds the orb to speak
 *   2. Release → Whisper transcription → echo-ai response
 *   3. Both turns appear in the conversation scroll
 *   4. Repeat indefinitely until user dismisses
 *
 * Presented as a full-screen modal from MainStackNavigator.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
  interpolate,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { useAuthStore } from '../../store/auth'
import { supabase } from '../../services/supabase'
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Turn {
  id: string
  role: 'user' | 'echo'
  text: string
  timestamp: Date
}

type ConversationPhase =
  | 'idle'        // waiting for hold
  | 'recording'   // holding, mic active
  | 'processing'  // transcribing or calling echo-ai
  | 'speaking'    // echo response appearing

// ── Orb component ─────────────────────────────────────────────────────────────

interface OrbProps {
  phase: ConversationPhase
  onPressIn: () => void
  onPressOut: () => void
}

function EchoOrb({ phase, onPressIn, onPressOut }: OrbProps) {
  const pulseScale = useSharedValue(1)
  const glowOpacity = useSharedValue(0.3)

  useEffect(() => {
    if (phase === 'recording') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      )
      glowOpacity.value = withTiming(0.7, { duration: 400 })
    } else if (phase === 'processing') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 400 }),
          withTiming(0.97, { duration: 400 }),
        ),
        -1,
        false,
      )
      glowOpacity.value = withTiming(0.5, { duration: 300 })
    } else if (phase === 'speaking') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 300 }),
          withTiming(1, { duration: 300 }),
        ),
        -1,
        false,
      )
      glowOpacity.value = withTiming(0.6, { duration: 200 })
    } else {
      pulseScale.value = withSpring(1, { damping: 10 })
      glowOpacity.value = withTiming(0.3, { duration: 500 })
    }
  }, [phase, pulseScale, glowOpacity])

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0.3, 0.7], [1, 1.4]) }],
  }))

  const isActive = phase === 'recording'
  const isProcessing = phase === 'processing'

  return (
    <View style={s.orbWrapper}>
      {/* Outer glow */}
      <Animated.View style={[s.orbGlow, glowStyle]} />

      {/* Orb */}
      <Animated.View style={orbStyle}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isProcessing}
          style={[
            s.orb,
            isActive && s.orbActive,
            isProcessing && s.orbProcessing,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            isProcessing ? 'ECHO is thinking' :
            isActive ? 'Release to send' :
            'Hold to speak with ECHO'
          }
        >
          {isProcessing ? (
            <ActivityIndicator color={Colors.indigo} size="large" />
          ) : (
            <Text style={s.orbIcon}>
              {isActive ? '🎙' : '✦'}
            </Text>
          )}
        </Pressable>
      </Animated.View>

      {/* Hint label */}
      <Text style={s.orbHint}>
        {phase === 'idle'       ? 'Hold to speak'        :
         phase === 'recording'  ? 'Release to send'      :
         phase === 'processing' ? 'ECHO is thinking…'    :
                                  'ECHO is responding'}
      </Text>
    </View>
  )
}

// ── Turn bubble ────────────────────────────────────────────────────────────────

function TurnBubble({ turn }: { turn: Turn }) {
  const isUser = turn.role === 'user'
  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      style={[s.bubble, isUser ? s.bubbleUser : s.bubbleEcho]}
    >
      {!isUser && (
        <Text style={s.bubbleLabel}>ECHO</Text>
      )}
      <Text style={[s.bubbleText, isUser ? s.bubbleTextUser : s.bubbleTextEcho]}>
        {turn.text}
      </Text>
      <Text style={s.bubbleTime}>
        {turn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Animated.View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function VoiceConversationScreen() {
  const navigation = useNavigation()
  const { user } = useAuthStore()

  const [turns, setTurns] = useState<Turn[]>([])
  const [phase, setPhase] = useState<ConversationPhase>('idle')
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<ScrollView>(null)
  const pendingEntryId = useRef<string | null>(null)

  const {
    state: voiceState,
    durationMs,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder()

  // Sync voice recorder state → phase
  useEffect(() => {
    if (voiceState === 'recording') setPhase('recording')
    else if (voiceState === 'processing') setPhase('processing')
    else if (voiceState === 'idle' && phase === 'processing') {
      // processing finished — handled in handleRelease
    }
  }, [voiceState, phase])

  // Auto-scroll to bottom whenever turns change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [turns])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handlePressIn = useCallback(async () => {
    if (phase !== 'idle') return
    setError(null)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    await startRecording()
  }, [phase, startRecording])

  const handlePressOut = useCallback(async () => {
    if (phase !== 'recording') return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Transcript arrives as return value from stopRecording
    const text = await stopRecording()
    if (!text || text.trim().length < 3) {
      setPhase('idle')
      return
    }

    // Append user turn
    const userTurn: Turn = {
      id:        `u-${Date.now()}`,
      role:      'user',
      text:      text.trim(),
      timestamp: new Date(),
    }
    setTurns(prev => [...prev, userTurn])
    setPhase('processing')

    try {
      // Submit to echo-ai via a lightweight text-only entry
      const { data: entryData, error: entryErr } = await supabase
        .from('entries')
        .insert({
          user_id:      user?.id,
          content:      text.trim(),
          entry_type:   'voice_converse',
          word_count:   text.trim().split(/\s+/).length,
        })
        .select('id')
        .single()

      if (entryErr || !entryData) throw new Error(entryErr?.message ?? 'Failed to create entry')

      pendingEntryId.current = entryData.id

      const { data: echoData, error: echoErr } = await supabase.functions.invoke('echo-ai', {
        body: {
          entry_id: entryData.id,
          content:  text.trim(),
        },
      })

      if (echoErr) throw new Error(echoErr.message)

      const echoText: string = echoData?.response ?? 'I heard you.'

      const echoTurn: Turn = {
        id:        `e-${Date.now()}`,
        role:      'echo',
        text:      echoText,
        timestamp: new Date(),
      }
      setTurns(prev => [...prev, echoTurn])
      setPhase('speaking')

      // Small delay then back to idle
      setTimeout(() => setPhase('idle'), 1200)
    } catch (err) {
      console.error('[VoiceConversation]', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setPhase('idle')
    }
  }, [phase, stopRecording, user])

  const handleCancel = useCallback(async () => {
    await cancelRecording()
    setPhase('idle')
  }, [cancelRecording])

  const handleClose = useCallback(async () => {
    if (phase === 'recording') await cancelRecording()
    navigation.goBack()
  }, [phase, cancelRecording, navigation])

  // ── Render ──────────────────────────────────────────────────────────────────

  const showDuration = phase === 'recording' && durationMs > 0

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={handleClose} style={s.closeBtn} hitSlop={12}>
          <Text style={s.closeIcon}>✕</Text>
        </Pressable>
        <Text style={s.headerTitle}>Voice</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Conversation scroll */}
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {turns.length === 0 && (
          <Animated.View entering={FadeIn.duration(600)} style={s.emptyState}>
            <Text style={s.emptyIcon}>✦</Text>
            <Text style={s.emptyTitle}>Speak with ECHO</Text>
            <Text style={s.emptyBody}>
              Hold the orb below and speak freely.{'\n'}
              ECHO listens and responds, building on what it knows about you.
            </Text>
          </Animated.View>
        )}

        {turns.map(turn => (
          <TurnBubble key={turn.id} turn={turn} />
        ))}

        {/* Error message */}
        {error && (
          <Animated.View entering={FadeInDown.duration(300)} style={s.errorBanner}>
            <Text style={s.errorText}>{error}</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Orb section */}
      <View style={s.orbSection}>
        {/* Recording duration */}
        {showDuration && (
          <Animated.Text entering={FadeIn.duration(200)} style={s.duration}>
            {Math.floor(durationMs / 60000)}:{String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')}
          </Animated.Text>
        )}

        <EchoOrb
          phase={phase}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        />

        {/* Cancel while recording */}
        {phase === 'recording' && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Pressable onPress={handleCancel} style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        )}

        <Text style={s.footer}>
          {turns.length > 0
            ? `${turns.filter(t => t.role === 'user').length} turn${turns.filter(t => t.role === 'user').length !== 1 ? 's' : ''} this session`
            : 'Your voice stays private'}
        </Text>
      </View>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ORB_SIZE = 120

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.lg : Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.headingMd,
    color: Colors.textPrimary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 40,
    color: Colors.indigo,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.headingLg,
    color: Colors.textPrimary,
  },
  emptyBody: {
    ...Typography.bodyMd,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  // Bubbles
  bubble: {
    maxWidth: '85%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.indigo + '25',
    borderWidth: 1,
    borderColor: Colors.indigo + '40',
  },
  bubbleEcho: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  bubbleLabel: {
    ...Typography.label,
    color: Colors.violetLight,
    marginBottom: 4,
  },
  bubbleText: {
    ...Typography.bodyMd,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: Colors.textPrimary,
  },
  bubbleTextEcho: {
    color: Colors.textSecondary,
  },
  bubbleTime: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 6,
    alignSelf: 'flex-end',
  },

  // Error
  errorBanner: {
    backgroundColor: Colors.error + '20',
    borderWidth: 1,
    borderColor: Colors.error + '40',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySm,
    color: Colors.error,
    textAlign: 'center',
  },

  // Orb section
  orbSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border0,
  },
  duration: {
    ...Typography.bodyMd,
    color: Colors.indigo,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    letterSpacing: 1,
    minHeight: 22,
  },

  // Orb
  orbWrapper: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE * 1.8,
    height: ORB_SIZE * 1.8,
    borderRadius: (ORB_SIZE * 1.8) / 2,
    backgroundColor: Colors.indigo,
    top: -(ORB_SIZE * 0.4),
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: Colors.surface1,
    borderWidth: 1.5,
    borderColor: Colors.border1,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  orbActive: {
    backgroundColor: Colors.indigo + '20',
    borderColor: Colors.indigo,
    shadowOpacity: 0.6,
  },
  orbProcessing: {
    borderColor: Colors.violetLight,
    shadowColor: Colors.violetLight,
  },
  orbIcon: {
    fontSize: 44,
    color: Colors.indigo,
  },
  orbHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },

  // Cancel
  cancelBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  cancelText: {
    ...Typography.bodySm,
    color: Colors.error,
  },

  // Footer
  footer: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
})
