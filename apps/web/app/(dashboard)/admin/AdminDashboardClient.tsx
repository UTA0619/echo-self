'use client'

import { useState } from 'react'
import type { AdminKPIs, RecentUser, RecentEntry, CrisisEvent } from '@/lib/admin-data'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pct(part: number, total: number) {
  if (!total) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

const EMOTION_EMOJI: Record<string, string> = {
  joy: '😊', trust: '🤝', anticipation: '⚡', optimism: '🌟', love: '❤️',
  sadness: '😢', fear: '😨', anger: '😠', disgust: '🤢', surprise: '😲',
  mixed: '🌀',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#141620] border border-[#1E2030] rounded-xl p-4 flex flex-col gap-1">
      <p className="text-[11px] text-[#8B8FA8] uppercase tracking-widest font-medium">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-[#8B8FA8]">{sub}</p>}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-semibold text-[#8B8FA8] uppercase tracking-widest mt-8 mb-3">
      {title}
    </h2>
  )
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  kpis: AdminKPIs
  recentUsers: RecentUser[]
  recentEntries: RecentEntry[]
  crisisEvents: CrisisEvent[]
}

type Tab = 'overview' | 'users' | 'entries' | 'crisis'

export function AdminDashboardClient({ kpis, recentUsers, recentEntries, crisisEvents }: Props) {
  const [tab, setTab] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users',    label: `Users (${kpis.totalUsers})` },
    { id: 'entries',  label: 'Entries' },
    { id: 'crisis',   label: `Crisis${kpis.crisisEventsThisWeek > 0 ? ` 🔴 ${kpis.crisisEventsThisWeek}` : ''}` },
  ]

  return (
    <div className="space-y-6">
      {/* Tab nav */}
      <nav className="flex gap-1 bg-[#141620] rounded-xl p-1 border border-[#1E2030]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-[#7B6CF6] text-white'
                : 'text-[#8B8FA8] hover:text-white',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div>
            <SectionHeader title="Users" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Total users"  value={kpis.totalUsers} />
              <KpiCard label="New today"    value={kpis.usersToday} />
              <KpiCard label="New this week" value={kpis.usersThisWeek} />
              <KpiCard
                label="Pro subscribers"
                value={kpis.premiumUsers}
                sub={`${pct(kpis.premiumUsers, kpis.totalUsers)} conversion`}
              />
            </div>
          </div>

          <div>
            <SectionHeader title="Content" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Total entries"  value={kpis.totalEntries.toLocaleString()} />
              <KpiCard label="Entries today"  value={kpis.entriesToday} />
              <KpiCard label="This week"      value={kpis.entriesThisWeek} />
              <KpiCard
                label="Avg entries / user"
                value={kpis.avgEntriesPerUser}
                sub={`${kpis.totalMemories.toLocaleString()} memory chunks`}
              />
            </div>
          </div>

          <div>
            <SectionHeader title="Safety &amp; Reach" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                label="Crisis events (7d)"
                value={kpis.crisisEventsThisWeek}
                sub={`${kpis.crisisEventsTotal} total`}
              />
              <KpiCard
                label="Push tokens"
                value={kpis.pushTokensTotal}
                sub={`${pct(kpis.pushTokensTotal, kpis.totalUsers)} of users`}
              />
            </div>
          </div>

          {/* Recent crisis events preview */}
          {crisisEvents.length > 0 && (
            <div>
              <SectionHeader title="Recent Crisis Events" />
              <CrisisTable events={crisisEvents.slice(0, 5)} />
            </div>
          )}
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div>
          <SectionHeader title={`Recent signups (${recentUsers.length})`} />
          <div className="overflow-x-auto rounded-xl border border-[#1E2030]">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#141620] text-[#8B8FA8] text-[11px] uppercase tracking-wider">
                <tr>
                  {['Name', 'Email', 'Plan', 'Streak', 'Entries', 'Joined'].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2030]">
                {recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#141620]/50 transition-colors">
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                      {u.display_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[#8B8FA8] font-mono text-xs whitespace-nowrap">
                      {u.email ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {u.subscription_tier === 'premium'
                        ? <Badge color="#7B6CF6" label="Pro" />
                        : <Badge color="#8B8FA8" label="Free" />}
                    </td>
                    <td className="px-4 py-3 text-[#F6A26C] font-semibold tabular-nums">
                      🔥 {u.current_streak}
                    </td>
                    <td className="px-4 py-3 text-[#8B8FA8] tabular-nums">{u.total_entries}</td>
                    <td className="px-4 py-3 text-[#8B8FA8] whitespace-nowrap text-xs">
                      {fmtDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Entries ── */}
      {tab === 'entries' && (
        <div>
          <SectionHeader title={`Recent entries (redacted preview)`} />
          <div className="space-y-2">
            {recentEntries.map((e) => (
              <div
                key={e.id}
                className="bg-[#141620] border border-[#1E2030] rounded-xl p-4 flex items-start gap-4"
              >
                <span className="text-2xl shrink-0 mt-0.5">
                  {EMOTION_EMOJI[e.emotion ?? ''] ?? '📓'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#C8CADF] text-sm leading-relaxed line-clamp-2">
                    {e.content_preview}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-[#8B8FA8]">{e.display_name ?? 'anonymous'}</span>
                    <span className="text-[11px] text-[#4B4F6B]">{fmtDate(e.created_at)}</span>
                    {e.emotion && (
                      <span className="text-[11px] text-[#7B6CF6]">{e.emotion}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Crisis ── */}
      {tab === 'crisis' && (
        <div>
          <SectionHeader title="Crisis Events" />
          {crisisEvents.length === 0 ? (
            <div className="text-center py-16 text-[#8B8FA8] text-sm">
              No crisis events recorded ✓
            </div>
          ) : (
            <CrisisTable events={crisisEvents} />
          )}
        </div>
      )}
    </div>
  )
}

// ── CrisisTable ───────────────────────────────────────────────────────────────

function CrisisTable({ events }: { events: CrisisEvent[] }) {
  const severityColor: Record<string, string> = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#EAB308',
    low: '#22C55E',
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#1E2030]">
      <table className="w-full text-sm text-left">
        <thead className="bg-[#141620] text-[#8B8FA8] text-[11px] uppercase tracking-wider">
          <tr>
            {['User', 'Severity', 'Trigger phrase', 'Status', 'Time'].map((h) => (
              <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2030]">
          {events.map((ev) => (
            <tr key={ev.id} className="hover:bg-[#141620]/50 transition-colors">
              <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                {ev.display_name ?? ev.user_id.slice(0, 8)}
              </td>
              <td className="px-4 py-3">
                <Badge
                  color={severityColor[ev.severity] ?? '#8B8FA8'}
                  label={ev.severity}
                />
              </td>
              <td className="px-4 py-3 text-[#8B8FA8] italic text-xs max-w-[200px] truncate">
                {ev.trigger_phrase ?? '—'}
              </td>
              <td className="px-4 py-3">
                {ev.resolved
                  ? <Badge color="#22C55E" label="Resolved" />
                  : <Badge color="#EF4444" label="Open" />}
              </td>
              <td className="px-4 py-3 text-[#8B8FA8] text-xs whitespace-nowrap">
                {fmtDate(ev.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
