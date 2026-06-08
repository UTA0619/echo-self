/**
 * /join — Referral landing page
 *
 * Shown when someone visits /join (without a code) — general invite page.
 * /join/[code] redirects to /auth?ref=CODE (existing route).
 */
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Join ECHO — Your AI Memory Layer',
  description: 'ECHO is an AI-native memory layer that helps you understand yourself through daily journaling. Join thousands building their identity OS.',
  openGraph: {
    title: 'Join ECHO — Your AI Memory Layer',
    description: 'Understand yourself deeply. Journal daily, discover your patterns, and meet your future self.',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
}

const FEATURES = [
  {
    icon: '🪞',
    title: 'Daily Mirror',
    description: 'Write anything. ECHO reflects it back with emotional insight and pattern recognition.',
  },
  {
    icon: '🧬',
    title: 'Identity Web',
    description: 'Discover your core beliefs, values, fears, and strengths — extracted automatically from your entries.',
  },
  {
    icon: '🔭',
    title: 'Future Self',
    description: 'AI-projected trajectories show where your current patterns lead — 1 month, 3 months, 1 year out.',
  },
  {
    icon: '🌊',
    title: 'Memory Ocean',
    description: 'Every entry is semantically embedded. Search your past by feeling, theme, or moment.',
  },
]

const TESTIMONIALS = [
  {
    quote: "I've been journaling for years but ECHO is the first tool that actually builds something with my words.",
    name: 'Kai M.',
    role: 'Product designer',
  },
  {
    quote: "The identity web shocked me. It surfaced a core fear I'd never named out loud.",
    name: 'Priya R.',
    role: 'Founder',
  },
  {
    quote: "Reading a letter from my future self made me change a decision I'd been overthinking for weeks.",
    name: 'James L.',
    role: 'Software engineer',
  },
]

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-[#0A0B0F] text-white">
      {/* Nav */}
      <nav className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">ECHO</span>
        <Link
          href="/auth"
          className="text-sm text-[#8B8FA8] hover:text-white transition-colors"
        >
          Sign in →
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B6CF6]/10 border border-[#7B6CF6]/30 text-[#7B6CF6] text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7B6CF6] animate-pulse" />
          Now in early access
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
          Your memory layer.<br />
          <span className="text-[#7B6CF6]">Your identity OS.</span>
        </h1>

        <p className="text-lg text-[#8B8FA8] leading-relaxed mb-10 max-w-xl mx-auto">
          ECHO is an AI-native journaling platform that builds a living model of who you are —
          and shows you who you&apos;re becoming.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth"
            className="px-6 py-3 rounded-xl bg-[#7B6CF6] text-white font-semibold text-base hover:bg-[#6A5CE5] transition-colors shadow-lg shadow-[#7B6CF6]/20"
          >
            Start for free →
          </Link>
          <span className="text-[#8B8FA8] text-sm">No credit card · 7-day Pro trial</span>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-center text-sm font-semibold text-[#8B8FA8] uppercase tracking-widest mb-12">
          What ECHO does for you
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="bg-[#141620] border border-[#1E2030] rounded-2xl p-6"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-[#8B8FA8] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-center text-sm font-semibold text-[#8B8FA8] uppercase tracking-widest mb-12">
          From the community
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map(t => (
            <div
              key={t.name}
              className="bg-[#141620] border border-[#1E2030] rounded-2xl p-5"
            >
              <p className="text-sm text-[#C8CAD8] leading-relaxed mb-4 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-xs text-[#8B8FA8]">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 pb-24 text-center">
        <div className="bg-gradient-to-br from-[#141620] to-[#0F1018] border border-[#1E2030] rounded-2xl p-8">
          <p className="text-2xl font-bold mb-3">Ready to meet yourself?</p>
          <p className="text-[#8B8FA8] text-sm mb-6">
            Free forever · 3 entries/day · No tracking or ads
          </p>
          <Link
            href="/auth"
            className="inline-block px-6 py-3 rounded-xl bg-[#7B6CF6] text-white font-semibold hover:bg-[#6A5CE5] transition-colors"
          >
            Create your free account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E2030] py-8">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-xs text-[#8B8FA8]">
          <span>© 2026 ECHO · All rights reserved</span>
          <div className="flex gap-4">
            <a href="/auth" className="hover:text-white transition-colors">Sign in</a>
            <a href="mailto:hello@echoself.app" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
