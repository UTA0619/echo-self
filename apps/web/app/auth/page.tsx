'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight font-display text-echo-accent">
            ECHO
          </h1>
          <p className="text-echo-muted text-sm">Identity. Memory. Future Self.</p>
        </div>

        {/* Card */}
        <div className="bg-echo-surface border border-echo rounded-2xl p-6 space-y-5">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="text-2xl">✉️</div>
              <p className="text-echo-text font-medium">Check your email</p>
              <p className="text-echo-muted text-sm">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-echo-accent text-sm underline underline-offset-4"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {/* Magic link form */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-echo-muted text-xs uppercase tracking-widest">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-echo-surface-2 border border-echo rounded-xl px-4 py-3 text-echo-text placeholder:text-echo-muted text-sm outline-none focus:border-echo-accent transition-colors"
                  />
                </label>

                {error && (
                  <p className="text-red-400 text-xs">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-echo-accent hover:opacity-90 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-opacity"
                >
                  {loading ? 'Sending…' : 'Continue with email'}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-echo-border" />
                <span className="text-echo-muted text-xs">or</span>
                <div className="flex-1 h-px bg-echo-border" />
              </div>

              {/* Google OAuth */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 border border-echo rounded-xl py-3 text-echo-text text-sm hover:bg-echo-surface-2 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>

        <p className="text-center text-echo-muted text-xs">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline underline-offset-2">Terms</a> and{' '}
          <a href="/privacy" className="underline underline-offset-2">Privacy Policy</a>.
        </p>
      </div>
    </main>
  )
}
