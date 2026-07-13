import { verifyCron, invokeEdgeFunction } from '@/lib/cron'

// Scheduled 19:00 daily (see vercel.json). Sends streak / check-in reminders
// via the ai-push-notifications edge function (which self-selects due users).
export async function GET(req: Request) {
  const denied = verifyCron(req)
  if (denied) return denied
  return invokeEdgeFunction('ai-push-notifications')
}
