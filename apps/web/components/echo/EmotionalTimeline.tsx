'use client'

import { useEffect, useRef, useState } from 'react'
import type { EmotionPoint } from '@/lib/emotions'
import { EMOTION_COLORS } from '@/lib/emotions'

interface EmotionalTimelineProps {
  data: EmotionPoint[]
}

interface TooltipState {
  x: number
  y: number
  point: EmotionPoint
}

export function EmotionalTimeline({ data }: EmotionalTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      setWidth(entries[0]!.contentRect.width)
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-[#141620] border border-white/5 p-6 text-center">
        <p className="text-sm text-[#8B8FA8]">Emotional data will appear after your first few entries.</p>
      </div>
    )
  }

  const H = 120
  const PAD = { top: 12, right: 12, bottom: 24, left: 12 }
  const plotW = width - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const xScale = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * plotW
  const yScale = (score: number) => PAD.top + (1 - score) * plotH

  // Build smooth path
  const points = data.map((d, i) => ({ x: xScale(i), y: yScale(d.score), d }))

  const linePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]!
    const cx = (prev.x + p.x) / 2
    return `${acc} C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`
  }, '')

  const areaPath = `${linePath} L ${points[points.length - 1]!.x} ${H} L ${points[0]!.x} ${H} Z`

  // Dominant emotion summary
  const emotionCounts = data.reduce<Record<string, number>>((acc, d) => {
    acc[d.emotion] = (acc[d.emotion] ?? 0) + 1
    return acc
  }, {})
  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="rounded-xl bg-[#141620] border border-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-[#8B8FA8] uppercase tracking-widest">Emotional Arc</h2>
        <div className="flex items-center gap-2">
          {topEmotions.map(([emotion]) => (
            <span
              key={emotion}
              className="flex items-center gap-1 text-xs text-[#8B8FA8]"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: EMOTION_COLORS[emotion] ?? '#8B8FA8' }} />
              {emotion}
            </span>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative" style={{ height: H }}>
        <svg width={width} height={H} className="overflow-visible">
          {/* Area fill */}
          <defs>
            <linearGradient id="emotion-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7B6CF6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#7B6CF6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#emotion-grad)" />

          {/* Line */}
          <path d={linePath} fill="none" stroke="#7B6CF6" strokeWidth={1.5} strokeLinecap="round" />

          {/* Data points */}
          {points.map(({ x, y, d }, i) => {
            const color = EMOTION_COLORS[d.emotion] ?? '#8B8FA8'
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={data.length < 15 ? 4 : 3}
                fill={color}
                stroke="#141620"
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({ x, y, point: d })}
                onMouseLeave={() => setTooltip(null)}
              />
            )
          })}

          {/* X-axis labels */}
          {[0, Math.floor(data.length / 2), data.length - 1].map(i => {
            const p = data[i]
            if (!p) return null
            return (
              <text
                key={i}
                x={xScale(i)}
                y={H - 2}
                textAnchor="middle"
                fontSize={8}
                fill="#8B8FA8"
              >
                {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            )
          })}
        </svg>

        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 rounded-lg bg-[#0A0B0F]/90 border border-white/10 px-2.5 py-1.5 text-xs"
            style={{
              left: Math.min(tooltip.x + 8, width - 120),
              top: tooltip.y - 36,
            }}
          >
            <span className="font-medium text-[#F0F0F5]">{tooltip.point.emotion}</span>
            <span className="text-[#8B8FA8] ml-1">{Math.round(tooltip.point.score * 100)}%</span>
            <div className="text-[#8B8FA8]">
              {new Date(tooltip.point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
