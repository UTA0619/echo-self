'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONES = Intl.supportedValuesOf
  ? Intl.supportedValuesOf('timeZone')
  : ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo']

const GOAL_OPTIONS = [
  { id: 'self_awareness', label: 'Understand myself better', icon: '🪞' },
  { id: 'emotional_health', label: 'Improve emotional wellbeing', icon: '💚' },
  { id: 'habit_tracking', label: 'Track habits & patterns', icon: '🔁' },
  { id: 'future_self', label: 'Build toward my future self', icon: '🌟' },
  { id: 'memory_keeping', label: 'Preserve meaningful memories', icon: '📖' },
  { id: 'decision_making', label: 'Make better decisions', icon: '🧭' },
]

const VALUE_OPTIONS = [
  { id: 'growth', label: 'Growth', icon: '🌱' },
  { id: 'connection', label: 'Connection', icon: '🤝' },
  { id: 'freedom', label: 'Freedom', icon: '🕊️' },
  { id: 'creativity', label: 'Creativity', icon: '🎨' },
  { id: 'integrity', label: 'Integrity', icon: '⚖️' },
  { id: 'adventure', label: 'Adventure', icon: '🗺️' },
  { id: 'security', label: 'Security', icon: '🏡' },
  { id: 'impact', label: 'Impact', icon: '⚡' },
  { id: 'wisdom', label: 'Wisdom', icon: '🦉' },
  { id: 'health', label: 'Health', icon: '💪' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { id: 'achievement', label: 'Achievement', icon: '🏆' },
]

const TOTAL_STEPS = 5

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingClientProps {
  userId: string
  email: string
  defaultName: string
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepWelcome({ name, email, onChange }: { name: string; email: string; onChange: (v: string) => void }) {
  const guess = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-4xl">👋</p>
        <h2 className="text-2xl font-semibold text-[#F0F0F5]">Welcome to ECHO</h2>
        <p className="text-sm text-[#8B8FA8]">Your AI memory layer. What should ECHO call you?</p>
      </div>
      <div className="space-y-2">
        <label className="block text-xs text-[#8B8FA8] font-medium uppercase tracking-widest">Your name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          placeholder={guess || 'Your name'}
          autoFocus
          className="w-full rounded-xl bg-[#141620] border border-white/10 px-4 py-3 text-[#F0F0F5] placeholder:text-[#8B8FA8] text-sm outline-none focus:border-[#7B6CF6]/60 transition-colors"
        />
      </div>
    </div>
  )
}

function StepTimezone({ timezone, onChange }: { timezone: string; onChange: (v: string) => void }) {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-4xl">🌍</p>
        <h2 className="text-2xl font-semibold text-[#F0F0F5]">Where are you in the world?</h2>
        <p className="text-sm text-[#8B8FA8]">ECHO uses your timezone for daily check-ins and pattern detection.</p>
      </div>
      <div className="space-y-2">
        <label className="block text-xs text-[#8B8FA8] font-medium uppercase tracking-widest">Timezone</label>
        <select
          value={timezone || detected}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl bg-[#141620] border border-white/10 px-4 py-3 text-[#F0F0F5] text-sm outline-none focus:border-[#7B6CF6]/60 transition-colors appearance-none"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
          ))}
        </select>
        {!timezone && (
          <p className="text-[10px] text-[#7B6CF6]">Detected: {detected}</p>
        )}
      </div>
    </div>
  )
}

function StepGoals({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-4xl">🎯</p>
        <h2 className="text-2xl font-semibold text-[#F0F0F5]">What brings you to ECHO?</h2>
        <p className="text-sm text-[#8B8FA8]">Choose all that resonate. We&apos;ll tailor your experience.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {GOAL_OPTIONS.map((g) => {
          const active = selected.includes(g.id)
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition-all ${
                active
                  ? 'border-[#7B6CF6]/60 bg-[#7B6CF6]/10 text-[#F0F0F5]'
                  : 'border-white/5 bg-[#141620] text-[#8B8FA8] hover:border-white/20'
              }`}
            >
              <span>{g.icon}</span>
              <span className="leading-tight">{g.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepValues({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id))
    } else if (selected.length < 5) {
      onChange([...selected, id])
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-4xl">✦</p>
        <h2 className="text-2xl font-semibold text-[#F0F0F5]">Your core values</h2>
        <p className="text-sm text-[#8B8FA8]">Pick up to 5. These seed your identity graph.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {VALUE_OPTIONS.map((v) => {
          const active = selected.includes(v.id)
          const disabled = !active && selected.length >= 5
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => toggle(v.id)}
              disabled={disabled}
              className={`flex flex-col items-center gap-1 rounded-xl border py-3 px-2 text-xs transition-all disabled:opacity-30 ${
                active
                  ? 'border-[#7B6CF6]/60 bg-[#7B6CF6]/10 text-[#F0F0F5]'
                  : 'border-white/5 bg-[#141620] text-[#8B8FA8] hover:border-white/20'
              }`}
            >
              <span className="text-lg">{v.icon}</span>
              <span>{v.label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-center text-[10px] text-[#8B8FA8]">{selected.length}/5 selected</p>
    </div>
  )
}

function StepFirstEntry({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const MAX = 500
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-4xl">📝</p>
        <h2 className="text-2xl font-semibold text-[#F0F0F5]">
          {name ? `Hi ${name.split(' ')[0]}, ` : ''}write your first memory
        </h2>
        <p className="text-sm text-[#8B8FA8]">
          This is the first moment ECHO will remember. What&apos;s on your mind right now?
        </p>
      </div>
      <div className="relative rounded-xl bg-[#141620] border border-white/5 focus-within:border-[#7B6CF6]/50 transition-colors">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX))}
          placeholder="Today I feel… I'm thinking about… Something I want to remember…"
          rows={6}
          autoFocus
          className="w-full resize-none bg-transparent px-4 pt-4 pb-8 text-[#F0F0F5] placeholder:text-[#8B8FA8] text-sm leading-relaxed outline-none"
        />
        <span className="absolute bottom-2 right-3 text-[10px] text-[#8B8FA8]">{value.length}/{MAX}</span>
      </div>
      <p className="text-center text-[10px] text-[#8B8FA8]">Optional — you can always skip this</p>
    </div>
  )
}

// ─── Progress indicator ───────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i < current ? 'w-6 h-1.5 bg-[#7B6CF6]' : i === current ? 'w-6 h-1.5 bg-[#7B6CF6]/60' : 'w-1.5 h-1.5 bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingClient({ userId, email, defaultName }: OnboardingClientProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState(defaultName)
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [goals, setGoals] = useState<string[]>([])
  const [values, setValues] = useState<string[]>([])
  const [firstEntry, setFirstEntry] = useState('')

  const canProceed = [
    name.trim().length >= 1,      // Step 0: name required
    !!timezone,                    // Step 1: timezone required
    goals.length >= 1,             // Step 2: at least 1 goal
    values.length >= 1,            // Step 3: at least 1 value
    true,                          // Step 4: first entry optional
  ][step]

  async function handleFinish() {
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()

      // 1. Update profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          display_name: name.trim(),
          timezone,
          onboarding_completed: true,
          metadata: { goals, values },
        })
        .eq('id', userId)

      if (profileErr) throw profileErr

      // 2. Create identity trait seeds from selected values
      if (values.length > 0) {
        const traits = values.map((v) => ({
          user_id: userId,
          trait_name: v,
          trait_category: 'value',
          confidence: 0.8,
          evidence_count: 1,
          metadata: { source: 'onboarding' },
        }))
        await supabase.from('identity_traits').insert(traits)
      }

      // 3. Create first entry if provided (via API to trigger AI)
      if (firstEntry.trim().length >= 10) {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: firstEntry.trim() }),
        })
      }

      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again')
      setSaving(false)
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1)
    } else {
      handleFinish()
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <StepDots current={step} total={TOTAL_STEPS} />

      <div className="min-h-[380px] flex flex-col justify-center">
        {step === 0 && <StepWelcome name={name} email={email} onChange={setName} />}
        {step === 1 && <StepTimezone timezone={timezone} onChange={setTimezone} />}
        {step === 2 && <StepGoals selected={goals} onChange={setGoals} />}
        {step === 3 && <StepValues selected={values} onChange={setValues} />}
        {step === 4 && <StepFirstEntry name={name} value={firstEntry} onChange={setFirstEntry} />}
      </div>

      {error && (
        <p className="text-center text-xs text-red-400">{error}</p>
      )}

      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={saving}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-[#8B8FA8] hover:text-[#F0F0F5] hover:border-white/20 transition-colors disabled:opacity-40"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed || saving}
          className="flex-1 rounded-xl bg-[#7B6CF6] py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
        >
          {saving ? 'Setting up…' : step === TOTAL_STEPS - 1 ? 'Enter ECHO →' : 'Continue →'}
        </button>
      </div>

      {step === TOTAL_STEPS - 1 && !saving && (
        <button
          type="button"
          onClick={handleFinish}
          className="block w-full text-center text-xs text-[#8B8FA8] hover:text-[#F0F0F5] transition-colors"
        >
          Skip first entry →
        </button>
      )}
    </div>
  )
}
