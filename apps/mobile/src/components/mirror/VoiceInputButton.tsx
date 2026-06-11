/**
 * VoiceInputButton
 *
 * Press-and-hold to record, release to transcribe.
 * Shows pulsing ring while recording and a spinner while processing.
 */
import React, { useEffect, useRef } from 'react'
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Colors } from '../../theme/tokens'
import type { RecordingState } from '../../hooks/useVoiceRecorder'

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

interface Props {
  state: RecordingState
  durationMs: number
  onPressIn: () => void
  onPressOut: () => void
  disabled?: boolean
}

export function VoiceInputButton({
  state,
  durationMs,
  onPressIn,
  onPressOut,
  disabled,
}: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null)
  const opacityAnim = useRef(new Animated.Value(1)).current

  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'

  // Pulse ring while recording
  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      )
      pulseLoop.current.start()
      Animated.timing(opacityAnim, { toValue: 0.35, duration: 400, useNativeDriver: true }).start()
    } else {
      pulseLoop.current?.stop()
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start()
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start()
    }
  }, [isRecording, pulseAnim, opacityAnim])

  async function handlePressIn() {
    if (disabled || isProcessing) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPressIn()
  }

  async function handlePressOut() {
    if (disabled || !isRecording) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPressOut()
  }

  return (
    <View style={s.wrapper}>
      {/* Duration label */}
      {isRecording && (
        <Text style={s.duration}>{formatDuration(durationMs)}</Text>
      )}

      {/* Pulse ring */}
      <Animated.View
        style={[
          s.ring,
          {
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />

      {/* Core button */}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isProcessing}
        style={[
          s.btn,
          isRecording && s.btnRecording,
          (disabled || isProcessing) && s.btnDisabled,
        ]}
        accessibilityLabel={
          isRecording
            ? 'Release to transcribe'
            : isProcessing
              ? 'Transcribing…'
              : 'Hold to speak'
        }
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || isProcessing }}
      >
        {isProcessing ? (
          <ActivityIndicator color={Colors.indigo} size="small" />
        ) : (
          <Text style={s.icon}>{isRecording ? '🎙' : '🎤'}</Text>
        )}
      </Pressable>

      {/* Hint text */}
      <Text style={s.hint}>
        {isRecording
          ? 'Release to send'
          : isProcessing
            ? 'Transcribing…'
            : 'Hold to speak'}
      </Text>
    </View>
  )
}

const BUTTON_SIZE = 60
const RING_SIZE = 80

const s = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 6,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: Colors.indigo + '30',
    // vertically centred over the button (ring is larger)
    top: 18 + (BUTTON_SIZE - RING_SIZE) / 2,
  },
  btn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: Colors.surface1,
    borderWidth: 1.5,
    borderColor: Colors.border1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRecording: {
    backgroundColor: Colors.indigo + '20',
    borderColor: Colors.indigo,
  },
  btnDisabled: { opacity: 0.4 },
  icon: { fontSize: 24 },
  duration: {
    fontSize: 13,
    color: Colors.indigo,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    minHeight: 18,
  },
  hint: {
    fontSize: 10,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
  },
})
