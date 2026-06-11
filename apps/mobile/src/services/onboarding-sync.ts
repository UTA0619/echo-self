/**
 * onboarding-sync.ts
 *
 * Syncs all onboarding-collected data to Supabase on completion.
 * Called from PaywallScreen (the final onboarding step) after
 * the user either purchases Pro or chooses the Free plan.
 *
 * Data written:
 *  - profiles.display_name
 *  - profiles.onboarding_data  (JSONB snapshot of all collected fields)
 *  - profiles.onboarding_done  = true
 *  - profiles.streak_goal      (days/week commitment)
 *  - users.display_name        (mirror for join-free queries)
 */
import { supabase } from './supabase'

export interface OnboardingSyncPayload {
  userId: string            // auth.users.id (= users.id = profiles.auth_id)
  displayName: string
  selectedEmotions: string[]
  identityTags: string[]
  aspirations: string
  streakCommitment: number  // days/week, stored as streak_goal
  notificationsEnabled: boolean
  expoPushToken?: string    // if granted, register token
  platform?: 'ios' | 'android'
}

export interface SyncResult {
  ok: boolean
  error?: string
}

/**
 * Upsert the user's onboarding data into `profiles` and optionally
 * register their Expo push token in `push_tokens`.
 *
 * Safe to call multiple times — uses ON CONFLICT DO UPDATE semantics.
 */
export async function syncOnboardingToSupabase(
  payload: OnboardingSyncPayload,
): Promise<SyncResult> {
  const {
    userId,
    displayName,
    selectedEmotions,
    identityTags,
    aspirations,
    streakCommitment,
    notificationsEnabled,
    expoPushToken,
    platform,
  } = payload

  try {
    // 1. Upsert profile — RLS allows update where auth.uid() = auth_id
    const onboardingData = {
      selected_emotions: selectedEmotions,
      identity_tags: identityTags,
      aspirations,
      streak_commitment: streakCommitment,
      notifications_enabled: notificationsEnabled,
      completed_at: new Date().toISOString(),
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        onboarding_data: onboardingData,
        onboarding_done: true,
        streak_goal: Math.max(1, Math.min(7, streakCommitment)),
      })
      .eq('auth_id', userId)

    if (profileErr) {
      // Profile might not exist yet (trigger race). Fall through and try INSERT.
      console.warn('[onboarding-sync] profile update failed, trying upsert:', profileErr.message)

      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          auth_id: userId,
          display_name: displayName.trim(),
          onboarding_data: onboardingData,
          onboarding_done: true,
          streak_goal: Math.max(1, Math.min(7, streakCommitment)),
        }, { onConflict: 'auth_id' })

      if (upsertErr) {
        console.error('[onboarding-sync] profile upsert failed:', upsertErr.message)
        return { ok: false, error: upsertErr.message }
      }
    }

    // 2. Mirror display_name to the users table (best-effort)
    await supabase
      .from('users')
      .update({ display_name: displayName.trim() })
      .eq('id', userId)

    // 3. Register Expo push token (best-effort — don't fail if missing)
    if (notificationsEnabled && expoPushToken && platform) {
      const { error: tokenErr } = await supabase
        .from('push_tokens')
        .upsert(
          { user_id: userId, expo_push_token: expoPushToken, platform },
          { onConflict: 'user_id,expo_push_token' },
        )
      if (tokenErr) {
        console.warn('[onboarding-sync] push token upsert failed:', tokenErr.message)
        // Non-fatal — user can still use the app without push tokens
      }
    }

    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[onboarding-sync] unexpected error:', msg)
    return { ok: false, error: msg }
  }
}
