'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SubscriptionStatus } from '@/lib/subscription'

interface Profile {
  display_name:          string | null
  timezone:              string | null
  notification_time:     string | null  // HH:MM:SS
  notification_enabled:  boolean | null
  created_at:            string
}

interface Referral {
  referral_code:          string
  total_referrals:        number
  successful_referrals:   number
  reward_months_earned:   number
}

interface SettingsClientProps {
  user:          { id: string; email: string }
  profile:       Profile | null
  subscription:  SubscriptionStatus
  referral:      Referral | null
  upgradeStatus: string | null
}

export function SettingsClient({ user, profile, subscription, referral, upgradeStatus }: SettingsClientProps) {
  return (
    <div className="space-y-4">
      {/* Upgrade success / canceled banners */}
      {upgradeStatus === 'success' && (
        <div className="rounded-xl bg-[#6CF6C8]/10 border border-[#6CF6C8]/30 px-4 py-3 text-sm text-[#6CF6C8]">
          🎉 Welcome to ECHO Pro! Your upgrade is active.
        </div>
      )}
      {upgradeStatus === 'canceled' && (
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-[#8B8FA8]">
          Upgrade canceled — you&apos;re still on the free plan.
        </div>
      )}

      <ProfileSection user={user} profile={profile} />
      <NotificationSection userId={user.id} profile={profile} />
      <SubscriptionSection subscription={subscription} userId={user.id} />
      {referral && <ReferralSection referral={referral} />}
      <DataSection userId={user.id} />
      <DangerSection userId={user.id} />
    </div>
  )
}

// ── Profile ──────────────────────────────────────────────────────────────────

function ProfileSection({ user, profile }: { user: { id: string; email: string }; profile: Profile | null }) {
  const [name, setName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ display_name: name.trim() })
      .eq('auth_id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : ''

  return (
    <Section title="Profile">
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="block text-[10px] text-[#8B8FA8] uppercase tracking-widest">Email</label>
          <p className="text-sm text-[#F0F0F5]">{user.email}</p>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] text-[#8B8FA8] uppercase tracking-widest">Display name</label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg bg-[#0A0B0F] border border-white/10 px-3 py-2 text-sm text-[#F0F0F5] outline-none focus:border-[#7B6CF6]/50 transition-colors"
            />
            <button
              onClick={handleSave}
              disabled={saving || name.trim() === (profile?.display_name ?? '')}
              className="px-3 py-2 rounded-lg bg-[#7B6CF6]/10 border border-[#7B6CF6]/30 text-xs text-[#7B6CF6] hover:bg-[#7B6CF6]/20 transition-colors disabled:opacity-40"
            >
              {saved ? '✓' : saving ? '…' : 'Save'}
            </button>
          </div>
        </div>
        {memberSince && (
          <p className="text-[10px] text-[#8B8FA8]">Member since {memberSince}</p>
        )}
      </div>
    </Section>
  )
}

// ── Subscription ──────────────────────────────────────────────────────────────

function SubscriptionSection({ subscription, userId }: { subscription: SubscriptionStatus; userId: string }) {
  const [loading, setLoading] = useState<'monthly' | 'annual' | 'portal' | null>(null)

  async function checkout(plan: 'monthly' | 'annual') {
    setLoading(plan)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const { url, error } = await res.json() as { url?: string; error?: string }
    if (url) window.location.href = url
    else { console.error(error); setLoading(null) }
  }

  async function openPortal() {
    setLoading('portal')
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const { url, error } = await res.json() as { url?: string; error?: string }
    if (url) window.location.href = url
    else { console.error(error); setLoading(null) }
  }

  return (
    <Section title="Subscription">
      {subscription.isPremium ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B6CF6]/15 border border-[#7B6CF6]/30 px-3 py-1 text-xs font-medium text-[#7B6CF6]">
              ✦ ECHO Pro
            </span>
            {subscription.expiresAt && (
              <span className="text-[10px] text-[#8B8FA8]">
                Renews {new Date(subscription.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <button
            onClick={openPortal}
            disabled={loading === 'portal'}
            className="text-xs text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors disabled:opacity-40"
          >
            {loading === 'portal' ? 'Opening…' : 'Manage billing →'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[#8B8FA8]">You&apos;re on the free plan — 3 entries/day, no AI features.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => checkout('monthly')}
              disabled={!!loading}
              className="flex flex-col items-center rounded-xl border border-[#7B6CF6]/30 bg-[#7B6CF6]/10 px-4 py-3 transition-colors hover:bg-[#7B6CF6]/20 disabled:opacity-40"
            >
              <span className="text-lg font-semibold text-[#F0F0F5]">$12</span>
              <span className="text-[10px] text-[#8B8FA8]">per month</span>
              {loading === 'monthly' && <span className="mt-1 text-[10px] text-[#7B6CF6]">Loading…</span>}
            </button>
            <button
              onClick={() => checkout('annual')}
              disabled={!!loading}
              className="relative flex flex-col items-center rounded-xl border border-[#7B6CF6]/60 bg-[#7B6CF6]/15 px-4 py-3 transition-colors hover:bg-[#7B6CF6]/25 disabled:opacity-40"
            >
              <span className="absolute -top-2 right-2 rounded-full bg-[#7B6CF6] px-2 py-0.5 text-[9px] font-medium text-white">Save 31%</span>
              <span className="text-lg font-semibold text-[#F0F0F5]">$99</span>
              <span className="text-[10px] text-[#8B8FA8]">per year</span>
              {loading === 'annual' && <span className="mt-1 text-[10px] text-[#7B6CF6]">Loading…</span>}
            </button>
          </div>
          <ul className="space-y-1">
            {[
              'Unlimited entries per day',
              'ECHO AI response to every entry',
              'Memory search (semantic)',
              'Identity Web visualization',
              'Behavioral pattern detection',
              'Future Self simulation',
              'Weekly AI digest',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-[#8B8FA8]">
                <span className="text-[#7B6CF6]">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}

// ── Referral ──────────────────────────────────────────────────────────────────

function ReferralSection({ referral }: { referral: Referral }) {
  const [copied, setCopied] = useState(false)
  const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://echo-self.app'}/join/${referral.referral_code}`

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Section title="Referrals">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Invited" value={referral.total_referrals} />
          <Stat label="Activated" value={referral.successful_referrals} />
          <Stat label="Months earned" value={referral.reward_months_earned} />
        </div>
        <button
          onClick={copy}
          className="w-full flex items-center justify-between rounded-lg bg-[#0A0B0F] border border-white/10 px-3 py-2 text-xs text-[#8B8FA8] hover:border-[#7B6CF6]/40 transition-colors"
        >
          <span className="truncate">{url}</span>
          <span className="ml-2 flex-shrink-0 text-[#7B6CF6]">{copied ? '✓ Copied' : 'Copy'}</span>
        </button>
        <p className="text-[10px] text-[#8B8FA8]">Each friend who activates gives you both 1 month Pro free.</p>
      </div>
    </Section>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

function NotificationSection({ userId, profile }: { userId: string; profile: Profile | null }) {
  const [time, setTime]       = useState(profile?.notification_time?.slice(0, 5) ?? '09:00')
  const [enabled, setEnabled] = useState(profile?.notification_enabled ?? true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ notification_time: `${time}:00`, notification_enabled: enabled })
      .eq('auth_id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Section title="Notifications">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#F0F0F5]">Daily reminder</p>
            <p className="text-[11px] text-[#8B8FA8] mt-0.5">ECHO will nudge you to reflect each day</p>
          </div>
          <button
            onClick={() => setEnabled((v) => !v)}
            className={[
              'relative w-11 h-6 rounded-full transition-colors duration-200',
              enabled ? 'bg-[#7B6CF6]' : 'bg-white/10',
            ].join(' ')}
            accessibilityLabel={enabled ? 'Disable notifications' : 'Enable notifications'}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className={[
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                enabled ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>

        {enabled && (
          <div className="space-y-1.5">
            <label className="block text-[10px] text-[#8B8FA8] uppercase tracking-widest">
              Reminder time (your local time)
            </label>
            <div className="flex gap-2">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex-1 rounded-lg bg-[#0A0B0F] border border-white/10 px-3 py-2 text-sm text-[#F0F0F5] outline-none focus:border-[#7B6CF6]/50 transition-colors"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-2 rounded-lg bg-[#7B6CF6]/10 border border-[#7B6CF6]/30 text-xs text-[#7B6CF6] hover:bg-[#7B6CF6]/20 transition-colors disabled:opacity-40"
              >
                {saved ? '✓' : saving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {!enabled && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs text-[#7B6CF6] hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save preference'}
          </button>
        )}
      </div>
    </Section>
  )
}

// ── Data export ───────────────────────────────────────────────────────────────

function DataSection({ userId }: { userId: string }) {
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      const res = await fetch('/api/account/export', { method: 'POST' })
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `echo-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportDone(true)
      setTimeout(() => setExportDone(false), 4000)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Section title="Your data">
      <div className="space-y-3">
        <p className="text-[11px] text-[#8B8FA8]">
          Download a complete copy of your journal entries, identity nodes, and behavioral patterns as JSON.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="text-xs text-[#7B6CF6] hover:opacity-80 disabled:opacity-40 transition-opacity"
        >
          {exportDone ? '✓ Download started' : exporting ? 'Preparing export…' : 'Export all data →'}
        </button>
        {exportError && (
          <p className="text-[11px] text-red-400">{exportError}</p>
        )}
      </div>
    </Section>
  )
}

// ── Danger zone ───────────────────────────────────────────────────────────────

function DangerSection({ userId }: { userId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    setDeleting(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    await fetch('/api/account/delete', { method: 'DELETE' })
    window.location.href = '/auth'
  }

  return (
    <Section title="Account">
      <div className="space-y-3">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`text-xs transition-colors disabled:opacity-40 ${
            confirming ? 'text-red-400 hover:text-red-300' : 'text-[#8B8FA8] hover:text-red-400'
          }`}
        >
          {deleting ? 'Deleting…' : confirming ? 'Click again to confirm deletion' : 'Delete account and all data'}
        </button>
        {confirming && !deleting && (
          <button
            onClick={() => setConfirming(false)}
            className="block text-xs text-[#8B8FA8] hover:text-[#F0F0F5]"
          >
            Cancel
          </button>
        )}
      </div>
    </Section>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#141620] border border-white/5 p-5 space-y-4">
      <h2 className="text-[10px] font-medium text-[#8B8FA8] uppercase tracking-widest">{title}</h2>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#0A0B0F] py-2 px-1 space-y-0.5">
      <p className="text-lg font-semibold text-[#F0F0F5] tabular-nums">{value}</p>
      <p className="text-[10px] text-[#8B8FA8]">{label}</p>
    </div>
  )
}
