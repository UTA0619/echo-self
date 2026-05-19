import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const audio = formData.get('audio') as Blob | null
  if (!audio) return NextResponse.json({ error: 'No audio file' }, { status: 400 })

  const whisperForm = new FormData()
  whisperForm.append('file', audio, 'recording.webm')
  whisperForm.append('model', 'whisper-1')
  whisperForm.append('language', 'en')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: whisperForm,
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Whisper error:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }

  const data = await res.json() as { text: string }
  return NextResponse.json({ text: data.text })
}
