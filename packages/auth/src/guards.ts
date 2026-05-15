// ECHO//SELF — Route Guards
// Middleware-level auth helpers for Next.js.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@echoself/supabase'

const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/auth/callback',
  '/auth/verify',
  '/r',           // referral landing pages
  '/api/stripe/webhook',  // Stripe webhooks are authenticated by signature
]

const ONBOARDING_ROUTE = '/onboarding'
const SIGN_IN_ROUTE = '/auth'

/**
 * Next.js proxy guard (Next.js 16+). Add to proxy.ts at the project root.
 * (In Next.js 15 and below, use middleware.ts instead.)
 *
 * Redirects unauthenticated users to /auth.
 * Redirects authenticated users who haven't completed onboarding to /onboarding.
 *
 * @example
 * // proxy.ts  (Next.js 16+)
 * import { authMiddleware } from '@echoself/auth'
 * export const proxy = authMiddleware
 * export const config = { runtime: 'nodejs', matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
 */
export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return response
  }

  // Skip static assets and API routes with their own auth
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/cron')) {
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Not authenticated → redirect to sign in
  if (!user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = SIGN_IN_ROUTE
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Authenticated but onboarding not done → redirect to onboarding
  if (!pathname.startsWith(ONBOARDING_ROUTE)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (profile && !profile.onboarding_completed) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = ONBOARDING_ROUTE
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}
