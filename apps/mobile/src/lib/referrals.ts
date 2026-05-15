// ECHO//SELF — Referral Code Library
// Generates, fetches, and shares referral codes.

import { Share } from 'react-native'
import { supabase } from '../services/supabase'

const BASE_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://echo-self.app'

// ─── Fetch or generate referral code for a user ───────────────────────────────

export async function getOrCreateReferralCode(userId: string): Promise<string | null> {
  // Check if profile already has a referral code
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single()

  if (profile?.referral_code) return profile.referral_code

  // Generate new code (handled by DB default, but ensure it's set)
  const code = generateCode()
  const { data, error } = await supabase
    .from('profiles')
    .update({ referral_code: code })
    .eq('id', userId)
    .select('referral_code')
    .single()

  if (error) {
    console.error('[referrals] Failed to create referral code:', error)
    return null
  }

  return data?.referral_code ?? null
}

// ─── Apply a referral code when a new user signs up ──────────────────────────

export async function applyReferralCode(
  newUserId: string,
  referralCode: string,
): Promise<{ success: boolean; referrerId?: string }> {
  // Find the referrer
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode.toUpperCase())
    .single()

  if (!referrer) return { success: false }

  // Can't refer yourself
  if (referrer.id === newUserId) return { success: false }

  // Record the referral
  const { error } = await supabase
    .from('profiles')
    .update({ referred_by: referrer.id })
    .eq('id', newUserId)
    .is('referred_by', null)  // Only apply once

  if (error) {
    console.error('[referrals] Failed to apply referral:', error)
    return { success: false }
  }

  // Insert referral event for analytics / reward tracking
  await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: newUserId,
    status:      'pending',
    created_at:  new Date().toISOString(),
  })

  return { success: true, referrerId: referrer.id }
}

// ─── Get referral stats ───────────────────────────────────────────────────────

export interface ReferralStats {
  code: string
  totalReferrals: number
  completedReferrals: number
  pendingRewards: number
}

export async function getReferralStats(userId: string): Promise<ReferralStats | null> {
  const [profileResult, referralsResult] = await Promise.all([
    supabase.from('profiles').select('referral_code').eq('id', userId).single(),
    supabase
      .from('referrals')
      .select('status')
      .eq('referrer_id', userId),
  ])

  if (!profileResult.data?.referral_code) return null

  const referrals = referralsResult.data ?? []
  const completed = referrals.filter((r) => r.status === 'completed').length
  const pending   = referrals.filter((r) => r.status === 'pending').length

  return {
    code:               profileResult.data.referral_code,
    totalReferrals:     referrals.length,
    completedReferrals: completed,
    pendingRewards:     pending,
  }
}

// ─── Share link builder ───────────────────────────────────────────────────────

export function buildReferralLink(code: string): string {
  return `${BASE_URL}/join?ref=${code}`
}

export async function shareReferralLink(code: string): Promise<void> {
  const link = buildReferralLink(code)
  await Share.share({
    message: `Join me on ECHO//SELF — the AI that helps you understand who you're becoming.\n\nUse my invite link: ${link}`,
    url: link,
    title: 'ECHO//SELF Invitation',
  })
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // No confusing I/O/0/1
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
