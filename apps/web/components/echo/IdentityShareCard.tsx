'use client'

import { useState } from 'react'
import type { IdentityNode } from '@/lib/identity'

const TYPE_COLORS: Record<string, string> = {
  value:                '#7B6CF6',
  belief:               '#A89DF8',
  strength:             '#6CF6C8',
  core_desire:          '#F6A26C',
  core_fear:            '#F66C6C',
  behavioral_pattern:   '#6C9EF6',
  relationship_pattern: '#F6D46C',
}

interface IdentityShareCardProps {
  nodes: IdentityNode[]
}

export function IdentityShareCard({ nodes }: IdentityShareCardProps) {
  const [shared, setShared] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const topNodes = nodes.slice(0, 5)

  async function handleShare() {
    setLoading(true)
    try {
      const res = await fetch('/api/identity/share', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate share link')
      const { url } = await res.json() as { url: string }
      setShareUrl(url)
      setShared(true)
      await navigator.clipboard.writeText(url)
    } catch {
      const fallback = `${window.location.origin}/identity/preview`
      setShareUrl(fallback)
      setShared(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleNativeShare() {
    if (!shareUrl) return
    if (navigator.share) {
      await navigator.share({ title: 'My ECHO Identity', text: 'Here is who I am, according to my AI memory layer.', url: shareUrl })
    } else {
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  return (
    <div className="rounded-xl bg-[#141620] border border-white/5 overflow-hidden">
      <div className="p-5 space-y-4 bg-gradient-to-br from-[#141620] to-[#0D0E18]">
        <p className="text-[10px] font-medium text-[#7B6CF6] uppercase tracking-widest">ECHO Identity</p>
        <div className="flex flex-wrap gap-2">
          {topNodes.map(node => (
            <span
              key={node.id}
              className="text-xs px-2.5 py-1 rounded-full border"
              style={{ color: TYPE_COLORS[node.type] ?? '#8B8FA8', borderColor: `${TYPE_COLORS[node.type] ?? '#8B8FA8'}30`, backgroundColor: `${TYPE_COLORS[node.type] ?? '#8B8FA8'}10` }}
            >
              {node.label}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-[#8B8FA8]">{nodes.length} identity signals detected · echo-self.app</p>
      </div>

      <div className="px-5 py-4 border-t border-white/5 space-y-3">
        {!shared ? (
          <button
            onClick={handleShare}
            disabled={loading}
            className="w-full rounded-lg bg-[#7B6CF6]/10 border border-[#7B6CF6]/30 py-2.5 text-sm font-medium text-[#7B6CF6] hover:bg-[#7B6CF6]/20 transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating link…' : 'Share my Identity Card →'}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-[#0A0B0F] border border-white/10 px-3 py-2">
              <span className="flex-1 text-xs text-[#8B8FA8] truncate">{shareUrl}</span>
              <span className="text-[10px] text-[#6CF6C8]">✓ Copied</span>
            </div>
            <button onClick={handleNativeShare} className="w-full text-xs text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors">Share via…</button>
          </div>
        )}
      </div>
    </div>
  )
}
