import { verifyCron, invokeEdgeFunction } from '@/lib/cron'

// Scheduled 08:00 daily (see vercel.json). Generates each user's daily insight.
export async function GET(req: Request) {
  const denied = verifyCron(req)
  if (denied) return denied
  return invokeEdgeFunction('generate-daily-insight')
}
