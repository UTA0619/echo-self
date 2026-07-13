import { verifyCron, invokeEdgeFunction } from '@/lib/cron'

// Scheduled 03:00 daily (see vercel.json). Refreshes future-self simulations for
// eligible (premium, ≥20 memories) users via the update-future-self edge function.
export async function GET(req: Request) {
  const denied = verifyCron(req)
  if (denied) return denied
  return invokeEdgeFunction('update-future-self')
}
