'use client'

import { useState } from 'react'
import { EntryComposer } from '@/components/echo/EntryComposer'
import { EntryCard } from '@/components/echo/EntryCard'
import { MemorySearch } from '@/components/echo/MemorySearch'
import { IdentityWeb } from '@/components/echo/IdentityWeb'
import { EmotionalTimeline } from '@/components/echo/EmotionalTimeline'
import { FutureSelfCard } from '@/components/echo/FutureSelfCard'
import { PatternInsights } from '@/components/echo/PatternInsights'
import { IdentityShareCard } from '@/components/echo/IdentityShareCard'
import { UpgradeModal } from '@/components/echo/UpgradeModal'
import type { Entry } from '@/lib/entries'
import type { IdentityNode, BehavioralPattern } from '@/lib/identity'
import type { EmotionPoint } from '@/lib/emotions'

interface DashboardClientProps {
  initialEntries: Entry[]
  identityNodes: IdentityNode[]
  emotionHistory: EmotionPoint[]
  behavioralPatterns: BehavioralPattern[]
  referralCode: string | null
  isPremium: boolean
}

type Tab = 'journal' | 'identity' | 'future'

function PremiumGate({
  feature,
  children,
  isPremium,
}: {
  feature: string
  children: React.ReactNode
  isPremium: boolean
}) {
  const [showModal, setShowModal] = useState(false)

  if (isPremium) return <>{children}</>

  return (
    <>
      <div
        className="relative cursor-pointer group"
        onClick={() => setShowModal(true)}
      >
        <div className="pointer-events-none select-none blur-sm opacity-60">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="rounded-lg bg-[#7B6CF6] px-4 py-2 text-sm font-medium text-white shadow-lg">
            Unlock {feature} →
          </button>
        </div>
      </div>
      {showModal && (
        <UpgradeModal feature={feature} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}

export function DashboardClient({
  initialEntries,
  identityNodes,
  emotionHistory,
  behavioralPatterns,
  referralCode,
  isPremium,
}: DashboardClientProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<Tab>('journal')

  function handleEntryCreated(entry: Entry) {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === entry.id)
      if (exists) return prev.map((e) => (e.id === entry.id ? entry : e))
      setNewEntryIds((ids) => new Set([...ids, entry.id]))
      return [entry, ...prev]
    })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'journal', label: 'Journal' },
    { id: 'identity', label: 'Identity' },
    { id: 'future', label: 'Future Self' },
  ]

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg bg-[#141620] p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
              tab === t.id
                ? 'bg-[#0A0B0F] text-[#F0F0F5]'
                : 'text-[#8B8FA8] hover:text-[#F0F0F5]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Journal tab */}
      {tab === 'journal' && (
        <div className="space-y-6">
          <PremiumGate feature="Memory Search" isPremium={isPremium}>
            <MemorySearch />
          </PremiumGate>

          <EntryComposer onEntryCreated={handleEntryCreated} />

          {emotionHistory.length > 0 && (
            <EmotionalTimeline data={emotionHistory} />
          )}

          {entries.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium text-[#8B8FA8] uppercase tracking-widest">Recent</h2>
              {entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  isNew={newEntryIds.has(entry.id)}
                />
              ))}
            </section>
          )}

          {entries.length === 0 && (
            <p className="text-center text-sm text-[#8B8FA8] py-8">
              Your memory layer is ready. Write your first entry above.
            </p>
          )}

          {/* Referral section at bottom of journal */}
          {referralCode && (
            <ReferralBanner referralCode={referralCode} />
          )}
        </div>
      )}

      {/* Identity tab */}
      {tab === 'identity' && (
        <div className="space-y-6">
          <PremiumGate feature="Identity Web" isPremium={isPremium}>
            <IdentityWeb nodes={identityNodes} />
          </PremiumGate>
          <PremiumGate feature="Pattern Insights" isPremium={isPremium}>
            <PatternInsights patterns={behavioralPatterns} />
          </PremiumGate>
          {identityNodes.length >= 3 && (
            <IdentityShareCard nodes={identityNodes} />
          )}
        </div>
      )}

      {/* Future Self tab */}
      {tab === 'future' && (
        <PremiumGate feature="Future Self" isPremium={isPremium}>
          <FutureSelfCard />
        </PremiumGate>
      )}
    </div>
  )
}

function ReferralBanner({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false)
  const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${referralCode}`

  async function handleCopy() {
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl bg-[#141620] border border-[#7B6CF6]/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[#7B6CF6]">✦</span>
        <p className="text-sm font-medium text-[#F0F0F5]">Share ECHO, earn 1 month free</p>
      </div>
      <p className="text-xs text-[#8B8FA8]">
        Invite a friend — when they join, you both get 1 month Pro free.
      </p>
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-between rounded-lg bg-[#0A0B0F] border border-white/10 px-3 py-2 text-xs text-[#8B8FA8] hover:border-[#7B6CF6]/40 transition-colors"
      >
        <span className="truncate">{referralUrl}</span>
        <span className="ml-2 flex-shrink-0 text-[#7B6CF6]">
          {copied ? '✓ Copied' : 'Copy'}
        </span>
      </button>
    </div>
  )
}
