// Client
export { getSupabaseBrowserClient } from './client/browser.js'
export { createSupabaseServerClient, createSupabaseAdminClient } from './client/server.js'

// Types
export type { Database, Tables, Inserts, Updates } from './types/database.js'

// Memory helpers
export { retrieveMemories, isDuplicateMemory, getRecentMemories } from './lib/memories.js'

// Subscription helpers
export {
  getSubscription,
  canCreateJournalEntry,
  isPro,
  getTrialDaysRemaining,
  FREE_TIER_LIMITS,
} from './lib/subscriptions.js'
