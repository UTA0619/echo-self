'use client'

import { useEffect, useState } from 'react'

interface EchoResponseProps {
  text: string | null
  streaming?: boolean
}

export function EchoResponse({ text, streaming = false }: EchoResponseProps) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    if (!text) return
    if (!streaming) {
      setDisplayed(text)
      return
    }

    // Animate text reveal character by character
    let i = 0
    setDisplayed('')
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, 12)

    return () => clearInterval(interval)
  }, [text, streaming])

  if (!text && !streaming) return null

  return (
    <div className="rounded-xl bg-[#141620] border border-[#7B6CF6]/20 px-4 py-3 space-y-1">
      <p className="text-xs font-medium text-[#7B6CF6]">ECHO</p>
      {text ? (
        <p className="text-sm text-[#F0F0F5] leading-relaxed whitespace-pre-wrap">
          {displayed}
          {streaming && displayed.length < text.length && (
            <span className="inline-block w-0.5 h-3.5 bg-[#7B6CF6] ml-0.5 animate-pulse align-middle" />
          )}
        </p>
      ) : (
        <div className="flex items-center gap-1.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B6CF6] animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B6CF6] animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B6CF6] animate-bounce [animation-delay:300ms]" />
        </div>
      )}
    </div>
  )
}
