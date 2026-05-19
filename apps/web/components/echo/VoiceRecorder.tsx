'use client'

import { useState, useRef, useCallback } from 'react'

type RecordingState = 'idle' | 'recording' | 'transcribing' | 'done' | 'error'

interface VoiceRecorderProps {
  onTranscription: (text: string) => void
}

export function VoiceRecorder({ onTranscription }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current!)
        setState('transcribing')

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        try {
          const form = new FormData()
          form.append('audio', blob)
          const res = await fetch('/api/transcribe', { method: 'POST', body: form })
          if (!res.ok) throw new Error('Transcription failed')
          const { text } = await res.json() as { text: string }
          onTranscription(text)
          setState('done')
        } catch {
          setState('error')
        } finally {
          setTimeout(() => setState('idle'), 2000)
        }
      }

      recorder.start(250)
      mediaRecorderRef.current = recorder
      setState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }, [onTranscription])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const labels: Record<RecordingState, string> = {
    idle: 'Voice',
    recording: formatTime(seconds),
    transcribing: 'Transcribing…',
    done: 'Done',
    error: 'Error',
  }

  const isRecording = state === 'recording'

  return (
    <button
      type="button"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={state === 'transcribing'}
      aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
        isRecording
          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
          : state === 'transcribing'
          ? 'bg-[#141620] text-[#8B8FA8] border border-white/5 opacity-60'
          : 'bg-[#141620] text-[#8B8FA8] border border-white/5 hover:border-[#7B6CF6]/40 hover:text-[#F0F0F5]'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-[#8B8FA8]'}`} />
      {labels[state]}
    </button>
  )
}
