export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-geist)' }}
          >
            ECHO
          </h1>
          <p className="text-echo-muted text-sm">Your memory layer</p>
        </div>
        <div className="bg-echo-surface border border-echo rounded-2xl p-6 space-y-4">
          <p className="text-echo-muted text-sm text-center">
            Sign in with magic link or Google
          </p>
          {/* E01-08: Supabase Auth UI wired here */}
        </div>
      </div>
    </main>
  )
}
