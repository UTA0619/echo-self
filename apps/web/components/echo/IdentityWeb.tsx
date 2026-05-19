'use client'

import { useEffect, useRef, useState } from 'react'
import type { IdentityNode, IdentityNodeType } from '@/lib/identity'

const TYPE_CONFIG: Record<IdentityNodeType, { color: string; ring: number }> = {
  value:               { color: '#7B6CF6', ring: 1 },
  belief:              { color: '#A89DF8', ring: 1 },
  strength:            { color: '#6CF6C8', ring: 2 },
  core_desire:         { color: '#F6A26C', ring: 2 },
  core_fear:           { color: '#F66C6C', ring: 3 },
  behavioral_pattern:  { color: '#6C9EF6', ring: 3 },
  relationship_pattern:{ color: '#F6D46C', ring: 3 },
}

const POLARITY_OPACITY: Record<'positive' | 'negative' | 'neutral', number> = {
  positive: 1,
  neutral: 0.75,
  negative: 0.55,
}

interface NodePosition {
  node: IdentityNode
  x: number
  y: number
  radius: number
}

function layoutNodes(nodes: IdentityNode[], cx: number, cy: number): NodePosition[] {
  const rings = [0, 90, 160, 220]
  const byRing: Record<number, IdentityNode[]> = { 0: [], 1: [], 2: [], 3: [] }

  nodes.forEach(n => {
    const ring = TYPE_CONFIG[n.type]?.ring ?? 3
    byRing[ring].push(n)
  })

  // Centre node: highest-confidence value
  const positions: NodePosition[] = []

  byRing[0].forEach(n => {
    positions.push({ node: n, x: cx, y: cy, radius: 7 + n.confidence * 6 })
  })

  ;[1, 2, 3].forEach(ring => {
    const ringNodes = byRing[ring]
    const r = rings[ring]
    ringNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / ringNodes.length - Math.PI / 2
      positions.push({
        node: n,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        radius: 5 + n.confidence * 5,
      })
    })
  })

  return positions
}

interface IdentityWebProps {
  nodes: IdentityNode[]
}

export function IdentityWeb({ nodes }: IdentityWebProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<IdentityNode | null>(null)
  const [size, setSize] = useState({ w: 340, h: 340 })

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0]!.contentRect
      const s = Math.min(width, 500)
      setSize({ w: s, h: s })
    })
    if (svgRef.current?.parentElement) obs.observe(svgRef.current.parentElement)
    return () => obs.disconnect()
  }, [])

  if (nodes.length === 0) {
    return (
      <div className="rounded-xl bg-[#141620] border border-white/5 p-6 text-center">
        <p className="text-sm text-[#8B8FA8]">Your identity web will appear after a few journal entries.</p>
      </div>
    )
  }

  const cx = size.w / 2
  const cy = size.h / 2

  // Sort: values first → centre, then by confidence desc
  const sorted = [...nodes].sort((a, b) => {
    const ra = TYPE_CONFIG[a.type]?.ring ?? 3
    const rb = TYPE_CONFIG[b.type]?.ring ?? 3
    return ra !== rb ? ra - rb : b.confidence - a.confidence
  })

  const positions = layoutNodes(sorted, cx, cy)

  return (
    <div className="rounded-xl bg-[#141620] border border-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-[#8B8FA8] uppercase tracking-widest">Identity Web</h2>
        <span className="text-xs text-[#8B8FA8]">{nodes.length} signals</span>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          className="w-full"
          viewBox={`0 0 ${size.w} ${size.h}`}
        >
          {/* Ambient rings */}
          {[90, 160, 220].map(r => (
            <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="white" strokeOpacity={0.04} />
          ))}

          {/* Edges from centre to each node */}
          {positions.filter(p => p.node !== positions[0]?.node).map(p => (
            <line
              key={`edge-${p.node.id}`}
              x1={cx} y1={cy}
              x2={p.x} y2={p.y}
              stroke={TYPE_CONFIG[p.node.type]?.color ?? '#8B8FA8'}
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          ))}

          {/* Nodes */}
          {positions.map(({ node, x, y, radius }) => {
            const color = TYPE_CONFIG[node.type]?.color ?? '#8B8FA8'
            const opacity = POLARITY_OPACITY[node.polarity]
            const isHovered = hovered?.id === node.id

            return (
              <g
                key={node.id}
                transform={`translate(${x},${y})`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(node)}
                onMouseLeave={() => setHovered(null)}
              >
                {isHovered && (
                  <circle r={radius + 6} fill={color} fillOpacity={0.15} />
                )}
                <circle
                  r={radius}
                  fill={color}
                  fillOpacity={opacity * (isHovered ? 1 : 0.85)}
                  style={{ transition: 'all 0.2s' }}
                />
                {radius > 8 && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y={radius + 10}
                    fontSize={9}
                    fill="white"
                    fillOpacity={0.6}
                  >
                    {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Tooltip */}
        {hovered && (
          <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-[#0A0B0F]/90 border border-white/10 px-3 py-2 pointer-events-none">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: TYPE_CONFIG[hovered.type]?.color }}
              />
              <span className="text-xs font-medium text-[#F0F0F5]">{hovered.label}</span>
              <span className="text-xs text-[#8B8FA8] ml-auto">{Math.round(hovered.confidence * 100)}%</span>
            </div>
            {hovered.description && (
              <p className="text-xs text-[#8B8FA8] leading-snug">{hovered.description}</p>
            )}
            <p className="text-xs text-[#7B6CF6] mt-0.5">{hovered.type.replace(/_/g, ' ')}</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-1">
        {(Object.entries(TYPE_CONFIG) as [IdentityNodeType, { color: string }][]).map(([type, { color }]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-[#8B8FA8]">{type.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
