import { NextResponse, type NextRequest } from 'next/server'
import { authMiddleware } from '@echoself/auth'

// In demo mode (no Supabase backend) bypass auth entirely so the local,
// backend-free /demo experience is reachable without credentials.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export function middleware(request: NextRequest) {
  if (DEMO_MODE) return NextResponse.next()
  return authMiddleware(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
