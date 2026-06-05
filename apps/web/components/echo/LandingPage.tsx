'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const FEATURES = [
  {
    icon: '🪞',
    title: 'Daily Mirror',
    body: 'Write or speak freely. ECHO reflects your emotional patterns back to you — not as analysis, but as understanding.',
  },
  {
    icon: '🧠',
    title: 'Identity Layer',
    body: 'Every entry builds a living map of your beliefs, values, fears, and strengths. You'll see yourself more clearly over time.',
  },
  {
    icon: '🔮',
    title: 'Future Self',
    body: 'Simulate who you're becoming — 1 month, 3 months, 1 year out. Grounded in your real patterns, not optimistic guesses.',
  },
  {
    icon: '📡',
    title: 'Memory Retrieval',
    body: 'Search across months of memories semantically. Ask "when did I last feel this?" and get real answers.',
  },
]

const TESTIMONIALS = [
  {
    quote: 'It noticed I was in a creative low before I did. Then it found the pattern — every November.',
    name: 'Maya R.',
    role: 'Product designer',
  },
  {
    quote: 'The future-self simulation made me realise I'd been optimising for the wrong thing for 2 years.',
    name: 'James T.',
    role: 'Founder',
  },
  {
    quote: 'I've tried every journaling app. This is the first one that actually knows me.',
    name: 'Priya N.',
    role: 'Researcher',
  },
]

export function LandingPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-echo-bg text-echo-text">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-echo-border/40 bg-echo-bg/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-base font-semibold tracking-tight font-display">ECHO</span>
          <Link
            href="/auth"
            className="text-sm text-echo-muted hover:text-echo-text transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-3xl mx-auto px-4 pt-24 pb-20 text-center">
        <p className="text-xs tracking-widest text-echo-accent uppercase mb-6 font-medium">
          AI Memory Layer · Identity OS · Future Self
        </p>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 font-display">
          Finally understand<br />
          <span className="text-echo-accent">who you are</span>
        </h1>
        <p className="text-lg text-echo-muted max-w-xl mx-auto mb-10 leading-relaxed">
          ECHO builds a persistent memory of your life, surfaces patterns you can't see yourself,
          and simulates the futures your choices are creating.
        </p>

        {/* Sign-up form */}
        {!sent ? (
          <form onSubmit={handleSignup} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 px-4 py-3 rounded-xl bg-echo-surface border border-echo-border text-echo-text placeholder-echo-muted/50 focus:outline-none focus:border-echo-accent transition-colors text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-echo-accent text-white font-semibold text-sm hover:bg-echo-accent/90 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {loading ? 'Sending…' : 'Start free →'}
            </button>
          </form>
        ) : (
          <div className="max-w-md mx-auto px-6 py-4 rounded-xl bg-echo-surface border border-echo-accent/30 text-sm text-echo-muted">
            ✦ Check your inbox — magic link sent to <strong className="text-echo-text">{email}</strong>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-400">{error}</p>
        )}

        <p className="mt-4 text-xs text-echo-muted/60">
          No password. No credit card for free tier. Privacy-first.
        </p>
      </section>

      {/* ── Features ── */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="rounded-2xl bg-echo-surface border border-echo-border p-6 space-y-3 hover:border-echo-accent/30 transition-colors"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-semibold text-echo-text">{f.title}</h3>
              <p className="text-sm text-echo-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-3xl mx-auto px-4 pb-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-4 font-display">
          Built differently
        </h2>
        <p className="text-echo-muted mb-12 max-w-lg mx-auto text-sm leading-relaxed">
          Most journaling apps store your words. ECHO understands them — extracting identity nodes,
          detecting behavioral patterns, and building a semantic memory that persists across months.
        </p>
        <div className="grid grid-cols-3 gap-6 text-sm">
          {[
            { step: '01', title: 'Write or speak', desc: 'Daily reflections in under 3 minutes' },
            { step: '02', title: 'ECHO learns', desc: 'Identity nodes + patterns extracted automatically' },
            { step: '03', title: 'See yourself clearly', desc: 'Future self simulations from your real trajectory' },
          ].map(s => (
            <div key={s.step} className="space-y-2">
              <div className="text-echo-accent font-mono text-xs">{s.step}</div>
              <div className="font-semibold text-echo-text">{s.title}</div>
              <div className="text-echo-muted text-xs leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map(t => (
            <div
              key={t.name}
              className="rounded-2xl bg-echo-surface border border-echo-border p-6 space-y-4"
            >
              <p className="text-sm text-echo-text leading-relaxed italic">"{t.quote}"</p>
              <div>
                <div className="text-sm font-medium text-echo-text">{t.name}</div>
                <div className="text-xs text-echo-muted">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-2xl mx-auto px-4 pb-32 text-center">
        <div className="rounded-3xl bg-echo-surface border border-echo-accent/20 p-12 space-y-6">
          <h2 className="text-3xl font-bold tracking-tight font-display">
            Start understanding yourself
          </h2>
          <p className="text-echo-muted text-sm">
            Free to start. Takes 3 minutes a day.
          </p>
          <Link
            href="/auth"
            className="inline-block px-8 py-4 rounded-2xl bg-echo-accent text-white font-semibold hover:bg-echo-accent/90 transition-colors"
          >
            Begin your memory layer →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-echo-border/40 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-echo-muted">
          <span>© {new Date().getFullYear()} ECHO. Built for self-aware humans.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-echo-text transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-echo-text transition-colors">Terms</Link>
            <Link href="/auth" className="hover:text-echo-text transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
