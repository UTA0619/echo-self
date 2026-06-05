/**
 * useVoiceRecorder
 *
 * Wraps expo-av Audio recording + Supabase voice-transcribe edge function.
 * States: idle → requesting → recording → processing → idle | error
 */
import { useState, useRef, useCallback } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { supabase } from '../services/supabase'

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error'

interface UseVoiceRecorderReturn {
  state: RecordingState
  durationMs: number
  transcript: string | null
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<string | null>   // resolves to transcript text or null
  cancelRecording: () => Promise<void>
  clearTranscript: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [durationMs, setDurationMs] = useState(0)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recordingRef = useRef<Audio.Recording | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    setError(null)
    setTranscript(null)
    setState('requesting')

    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        setError('Microphone permission denied')
        setState('error')
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      )

      recordingRef.current = recording
      startTimeRef.current = Date.now()
      setDurationMs(0)
      setState('recording')

      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current)
      }, 100)
    } catch (e) {
      setError(String(e))
      setState('error')
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setState('processing')

    try {
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      recordingRef.current = null

      if (!uri) {
        setState('idle')
        return null
      }

      // Read recording as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      // Delete temp file immediately
      await FileSystem.deleteAsync(uri, { idempotent: true })

      // Reset audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      })

      // Send to Whisper via edge function
      const { data, error: fnError } = await supabase.functions.invoke('voice-transcribe', {
        body: { audio_base64: base64, mime_type: 'audio/m4a' },
      })

      if (fnError) throw new Error(fnError.message)

      const text: string = data?.transcript ?? ''
      setTranscript(text)
      setState('idle')
      setDurationMs(0)
      return text
    } catch (e) {
      setError(String(e))
      setState('error')
      return null
    }
  }, [])

  const cancelRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync()
        const uri = recordingRef.current.getURI()
        if (uri) await FileSystem.deleteAsync(uri, { idempotent: true })
      } catch {
        // best-effort cleanup
      }
      recordingRef.current = null
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })
      .catch(() => {})

    setState('idle')
    setDurationMs(0)
    setError(null)
  }, [])

  const clearTranscript = useCallback(() => setTranscript(null), [])

  return {
    state,
    durationMs,
    transcript,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearTranscript,
  }
}
