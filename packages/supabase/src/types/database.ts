/**
 * @echo-self/supabase — Database Types
 *
 * Hand-maintained to match the current migration state (through migration 015).
 * Regenerate with: `supabase gen types typescript --local > packages/supabase/src/types/database.ts`
 * and reconcile with the hand-tuned comments / extras below.
 *
 * Last updated: migrations 001–015
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Column type unions ────────────────────────────────────────────────────────

export type IdentityNodeType =
  | 'belief'
  | 'value'
  | 'core_fear'
  | 'core_desire'
  | 'behavioral_pattern'
  | 'relationship_pattern'
  | 'strength'

export type EmotionType =
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust'
  | 'anticipation' | 'trust' | 'optimism' | 'love' | 'awe' | 'calm'
  | 'anxiety' | 'gratitude' | 'hope' | 'frustration' | 'neutral'

export type SubscriptionTier = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
export type SubscriptionPlan = 'premium_monthly' | 'premium_annual'
export type CrisisSeverity = 'critical' | 'high' | 'medium' | 'low'
export type NotificationType = 'daily_insight' | 'ai_push' | 'streak_reminder' | 'weekly_summary' | 'system'
export type HorizonMonths = 1 | 3 | 12

// ── Database ──────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {

      // ── users (migration 001) ───────────────────────────────────────────────
      users: {
        Row: {
          id:                string
          auth_id:           string
          email:             string | null
          display_name:      string | null
          current_streak:    number
          longest_streak:    number
          subscription_tier: SubscriptionTier
          deletion_requested_at: string | null
          deleted_at:        string | null
          created_at:        string
        }
        Insert: {
          id?:               string
          auth_id:           string
          email?:            string | null
          display_name?:     string | null
          current_streak?:   number
          longest_streak?:   number
          subscription_tier?: SubscriptionTier
          deletion_requested_at?: string | null
          deleted_at?:       string | null
          created_at?:       string
        }
        Update: {
          id?:               string
          auth_id?:          string
          email?:            string | null
          display_name?:     string | null
          current_streak?:   number
          longest_streak?:   number
          subscription_tier?: SubscriptionTier
          deletion_requested_at?: string | null
          deleted_at?:       string | null
          created_at?:       string
        }
      }

      // ── entries (migration 002, formerly journal_entries) ───────────────────
      entries: {
        Row: {
          id:           string
          user_id:      string
          content:      string
          word_count:   number
          emotion:      EmotionType | null
          emotion_data: Json | null    // EmotionAnalysis JSONB
          ai_response:  string | null
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id?:          string
          user_id:      string
          content:      string
          word_count?:  number
          emotion?:     EmotionType | null
          emotion_data?: Json | null
          ai_response?: string | null
          created_at?:  string
          updated_at?:  string
        }
        Update: {
          id?:          string
          user_id?:     string
          content?:     string
          word_count?:  number
          emotion?:     EmotionType | null
          emotion_data?: Json | null
          ai_response?: string | null
          created_at?:  string
          updated_at?:  string
        }
      }

      // ── memories (migration 003) ────────────────────────────────────────────
      memories: {
        Row: {
          id:              string
          user_id:         string
          source_entry_id: string | null
          content_chunk:   string
          embedding:       string | null  // vector(3072) stored as text; never in SELECT
          importance:      number          // 0–1
          created_at:      string
        }
        Insert: {
          id?:             string
          user_id:         string
          source_entry_id?: string | null
          content_chunk:   string
          embedding?:      string | null
          importance?:     number
          created_at?:     string
        }
        Update: {
          id?:             string
          user_id?:        string
          source_entry_id?: string | null
          content_chunk?:  string
          embedding?:      string | null
          importance?:     number
          created_at?:     string
        }
      }

      // ── identity_nodes (migration 007) ──────────────────────────────────────
      identity_nodes: {
        Row: {
          id:          string
          user_id:     string
          type:        IdentityNodeType
          label:       string
          description: string | null
          polarity:    'positive' | 'negative' | 'neutral'
          confidence:  number       // 0–1
          active:      boolean
          evidence:    string[]     // entry UUIDs
          created_at:  string
          updated_at:  string
        }
        Insert: {
          id?:         string
          user_id:     string
          type:        IdentityNodeType
          label:       string
          description?: string | null
          polarity?:   'positive' | 'negative' | 'neutral'
          confidence?:  number
          active?:      boolean
          evidence?:    string[]
          created_at?:  string
          updated_at?:  string
        }
        Update: {
          id?:          string
          user_id?:     string
          type?:        IdentityNodeType
          label?:       string
          description?: string | null
          polarity?:    'positive' | 'negative' | 'neutral'
          confidence?:  number
          active?:      boolean
          evidence?:    string[]
          created_at?:  string
          updated_at?:  string
        }
      }

      // ── behavioral_patterns (migration 008) ─────────────────────────────────
      behavioral_patterns: {
        Row: {
          id:                   string
          user_id:              string
          pattern_type:         string
          pattern_description:  string
          frequency_days:       number
          confidence:           number
          trigger_tags:         string[]
          is_active:            boolean
          created_at:           string
        }
        Insert: {
          id?:                  string
          user_id:              string
          pattern_type:         string
          pattern_description:  string
          frequency_days?:      number
          confidence?:          number
          trigger_tags?:        string[]
          is_active?:           boolean
          created_at?:          string
        }
        Update: {
          id?:                  string
          user_id?:             string
          pattern_type?:        string
          pattern_description?: string
          frequency_days?:      number
          confidence?:          number
          trigger_tags?:        string[]
          is_active?:           boolean
          created_at?:          string
        }
      }

      // ── profiles (migration 009) ────────────────────────────────────────────
      profiles: {
        Row: {
          id:                   string
          auth_id:              string    // FK → auth.users.id
          display_name:         string | null
          timezone:             string | null
          notification_time:    string | null    // "HH:MM:SS"
          notification_enabled: boolean
          onboarding_data:      Json | null
          onboarding_done:      boolean
          streak_goal:          number
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                  string
          auth_id:              string
          display_name?:        string | null
          timezone?:            string | null
          notification_time?:   string | null
          notification_enabled?: boolean
          onboarding_data?:     Json | null
          onboarding_done?:     boolean
          streak_goal?:         number
          created_at?:          string
          updated_at?:          string
        }
        Update: {
          id?:                  string
          auth_id?:             string
          display_name?:        string | null
          timezone?:            string | null
          notification_time?:   string | null
          notification_enabled?: boolean
          onboarding_data?:     Json | null
          onboarding_done?:     boolean
          streak_goal?:         number
          created_at?:          string
          updated_at?:          string
        }
      }

      // ── push_tokens (migration 010) ─────────────────────────────────────────
      push_tokens: {
        Row: {
          id:               string
          user_id:          string
          expo_push_token:  string
          platform:         'ios' | 'android'
          created_at:       string
        }
        Insert: {
          id?:              string
          user_id:          string
          expo_push_token:  string
          platform:         'ios' | 'android'
          created_at?:      string
        }
        Update: {
          id?:              string
          user_id?:         string
          expo_push_token?: string
          platform?:        'ios' | 'android'
          created_at?:      string
        }
      }

      // ── future_self_simulations (migration 011) ─────────────────────────────
      future_self_simulations: {
        Row: {
          id:               string
          user_id:          string
          horizon_months:   HorizonMonths
          narrative:        string
          letter_text:      string | null
          trajectory_score: number | null
          created_at:       string
        }
        Insert: {
          id?:              string
          user_id:          string
          horizon_months:   HorizonMonths
          narrative:        string
          letter_text?:     string | null
          trajectory_score?: number | null
          created_at?:      string
        }
        Update: {
          id?:              string
          user_id?:         string
          horizon_months?:  HorizonMonths
          narrative?:       string
          letter_text?:     string | null
          trajectory_score?: number | null
          created_at?:      string
        }
      }

      // ── crisis_events (migration 012) ───────────────────────────────────────
      crisis_events: {
        Row: {
          id:             string
          user_id:        string
          entry_id:       string | null
          severity:       CrisisSeverity
          trigger_phrase: string | null
          detected_tags:  string[]
          response_sent:  boolean
          resolved:       boolean
          resolved_by:    string | null
          resolved_at:    string | null
          notes:          string | null
          created_at:     string
        }
        Insert: {
          id?:            string
          user_id:        string
          entry_id?:      string | null
          severity:       CrisisSeverity
          trigger_phrase?: string | null
          detected_tags?:  string[]
          response_sent?:  boolean
          resolved?:       boolean
          resolved_by?:    string | null
          resolved_at?:    string | null
          notes?:          string | null
          created_at?:     string
        }
        Update: {
          id?:            string
          user_id?:       string
          entry_id?:      string | null
          severity?:      CrisisSeverity
          trigger_phrase?: string | null
          detected_tags?:  string[]
          response_sent?:  boolean
          resolved?:       boolean
          resolved_by?:    string | null
          resolved_at?:    string | null
          notes?:          string | null
          created_at?:     string
        }
      }

      // ── notifications (migration 013) ───────────────────────────────────────
      notifications: {
        Row: {
          id:         string
          user_id:    string
          type:       NotificationType
          title:      string | null
          body:       string | null
          message:    string | null     // legacy
          created_at: string
        }
        Insert: {
          id?:        string
          user_id:    string
          type:       NotificationType
          title?:     string | null
          body?:      string | null
          message?:   string | null
          created_at?: string
        }
        Update: {
          id?:        string
          user_id?:   string
          type?:      NotificationType
          title?:     string | null
          body?:      string | null
          message?:   string | null
          created_at?: string
        }
      }

      // ── subscriptions ──────────────────────────────────────────────────────
      subscriptions: {
        Row: {
          id:                      string
          user_id:                 string
          stripe_customer_id:      string
          stripe_subscription_id:  string
          stripe_price_id:         string | null
          status:                  SubscriptionStatus
          plan:                    SubscriptionPlan
          trial_ends_at:           string | null
          current_period_end:      string | null
          cancel_at_period_end:    boolean
          created_at:              string
          updated_at:              string
        }
        Insert: {
          id?:                     string
          user_id:                 string
          stripe_customer_id:      string
          stripe_subscription_id:  string
          stripe_price_id?:        string | null
          status?:                 SubscriptionStatus
          plan:                    SubscriptionPlan
          trial_ends_at?:          string | null
          current_period_end?:     string | null
          cancel_at_period_end?:   boolean
          created_at?:             string
          updated_at?:             string
        }
        Update: {
          id?:                     string
          user_id?:                string
          stripe_customer_id?:     string
          stripe_subscription_id?: string
          stripe_price_id?:        string | null
          status?:                 SubscriptionStatus
          plan?:                   SubscriptionPlan
          trial_ends_at?:          string | null
          current_period_end?:     string | null
          cancel_at_period_end?:   boolean
          created_at?:             string
          updated_at?:             string
        }
      }

      // ── referrals ──────────────────────────────────────────────────────────
      referrals: {
        Row: {
          id:                   string
          user_id:              string
          referral_code:        string
          total_referrals:      number
          successful_referrals: number
          reward_months_earned: number
          created_at:           string
        }
        Insert: {
          id?:                  string
          user_id:              string
          referral_code:        string
          total_referrals?:     number
          successful_referrals?: number
          reward_months_earned?: number
          created_at?:          string
        }
        Update: {
          id?:                  string
          user_id?:             string
          referral_code?:       string
          total_referrals?:     number
          successful_referrals?: number
          reward_months_earned?: number
          created_at?:          string
        }
      }

      // ── identity_shares (migration 015) ─────────────────────────────────────
      identity_shares: {
        Row: {
          id:           string
          user_id:      string
          display_name: string | null
          top_nodes:    Json       // Array<Pick<IdentityNode, 'type'|'label'|'confidence'|'polarity'>>
          share_text:   string | null
          is_public:    boolean
          created_at:   string
        }
        Insert: {
          id?:          string
          user_id:      string
          display_name?: string | null
          top_nodes?:   Json
          share_text?:  string | null
          is_public?:   boolean
          created_at?:  string
        }
        Update: {
          id?:          string
          user_id?:     string
          display_name?: string | null
          top_nodes?:   Json
          share_text?:  string | null
          is_public?:   boolean
          created_at?:  string
        }
      }

    }

    // ── Views ────────────────────────────────────────────────────────────────
    Views: Record<string, never>

    // ── Functions ────────────────────────────────────────────────────────────
    Functions: {
      match_memories: {
        Args: {
          query_embedding:  string    // serialized vector
          match_threshold:  number
          match_count:      number
          p_user_id:        string
        }
        Returns: Array<{
          id:          string
          content_chunk: string
          importance:  number
          similarity:  number
          created_at:  string
        }>
      }
      update_user_streak: {
        Args: { p_user_id: string }
        Returns: void
      }
    }

    // ── Enums ────────────────────────────────────────────────────────────────
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ── Convenience type helpers ──────────────────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
