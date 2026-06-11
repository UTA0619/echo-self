/**
 * analytics.ts — Unified analytics layer
 *
 * Wraps Sentry (error tracking + performance) and PostHog (product analytics)
 * behind a single, tree-shakeable module. Both are initialized lazily so they
 * don't block the JS bridge on cold start.
 *
 * Usage:
 *   import { Analytics } from '../lib/analytics';
 *   Analytics.track('entry_submitted', { word_count: 120 });
 *   Analytics.identify(userId, { plan: 'premium' });
 *   Analytics.screen('DailyMirror');
 *   Analytics.error(err, { context: 'submitEntry' });
 */

import * as Sentry from '@sentry/react-native';
import type PostHog from 'posthog-react-native';

// PostHog's event-property type isn't re-exported from the package root,
// so derive it from the instance method signatures.
type PostHogProps = Parameters<PostHog['capture']>[1];

// PostHog is imported lazily to avoid bundling it in the main chunk.
// Holds a constructed instance (posthog-react-native v3 is instance-based).
let _posthog: PostHog | null = null;

const SENTRY_DSN       = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const POSTHOG_API_KEY  = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST     = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';
const IS_DEV           = process.env.NODE_ENV === 'development';

// ──────────────────────────────────────────────────────────────────────────
// Initialisation — call once in App.tsx before rendering the navigator
// ──────────────────────────────────────────────────────────────────────────
export function initAnalytics(): void {
  // Sentry
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: IS_DEV ? 'development' : 'production',
      debug: IS_DEV,
      tracesSampleRate: IS_DEV ? 0 : 0.2,         // 20% performance traces in prod
      profilesSampleRate: IS_DEV ? 0 : 0.1,       // 10% profiling
      enableAutoPerformanceTracing: true,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      attachScreenshot: false,                     // PII protection
      beforeSend(event) {
        // Strip email PII from error events
        if (event.user?.email) {
          event.user.email = '[filtered]';
        }
        return event;
      },
    });
  }

  // PostHog — lazy import after Sentry to keep critical path fast
  import('posthog-react-native')
    .then(({ default: PostHogClass }) => {
      if (POSTHOG_API_KEY) {
        _posthog = new PostHogClass(POSTHOG_API_KEY, {
          host: POSTHOG_HOST,
          // Journal text is masked at the component layer; keep init minimal.
        });
      }
    })
    .catch((err) => {
      console.warn('[analytics] PostHog init failed:', err);
    });
}

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────
export const Analytics = {
  /**
   * Identify a user after authentication.
   * Sets Sentry user context and PostHog distinct_id.
   */
  identify(userId: string, traits: Record<string, unknown> = {}): void {
    Sentry.setUser({ id: userId });
    _posthog?.identify(userId, traits as PostHogProps);
  },

  /**
   * Capture a product event (button tap, feature used, etc.)
   */
  track(event: string, properties: Record<string, unknown> = {}): void {
    if (IS_DEV) console.log(`[analytics] track: ${event}`, properties);
    _posthog?.capture(event, properties as PostHogProps);
    Sentry.addBreadcrumb({ category: 'analytics', message: event, data: properties });
  },

  /**
   * Record a screen view — called in navigation state change listeners.
   */
  screen(name: string, properties: Record<string, unknown> = {}): void {
    if (IS_DEV) console.log(`[analytics] screen: ${name}`);
    _posthog?.screen(name, properties as PostHogProps);
    Sentry.addBreadcrumb({ category: 'navigation', message: name });
  },

  /**
   * Log an error to Sentry with additional context.
   */
  error(error: unknown, context: Record<string, unknown> = {}): void {
    console.error('[analytics] error:', error);
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      Sentry.captureException(error);
    });
  },

  /**
   * Start a Sentry performance span (returns a finish function).
   */
  startSpan(name: string, op = 'custom'): () => void {
    Sentry.startSpan({ name, op }, () => {});
    return () => { /* span finishes automatically */ };
  },

  /**
   * Reset analytics on sign-out.
   */
  reset(): void {
    Sentry.setUser(null);
    _posthog?.reset();
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Standard event constants — use these instead of raw strings to prevent typos
// ──────────────────────────────────────────────────────────────────────────
export const Events = {
  // Auth
  AUTH_MAGIC_LINK_SENT:    'auth_magic_link_sent',
  AUTH_APPLE_SIGNED_IN:    'auth_apple_signed_in',
  AUTH_GOOGLE_SIGNED_IN:   'auth_google_signed_in',
  AUTH_SIGNED_OUT:         'auth_signed_out',

  // Onboarding
  ONBOARDING_STARTED:      'onboarding_started',
  ONBOARDING_STEP:         (n: number) => `onboarding_step_${n}_completed`,
  ONBOARDING_COMPLETED:    'onboarding_completed',
  ONBOARDING_SKIPPED:      'onboarding_skipped',

  // Journal
  ENTRY_STARTED:           'entry_started',
  ENTRY_SUBMITTED:         'entry_submitted',
  ENTRY_WORD_GATE_BLOCKED: 'entry_word_gate_blocked',
  ECHO_RECEIVED:           'echo_received',
  ECHO_ERROR:              'echo_error',

  // Future Self
  FUTURE_SELF_VIEWED:      'future_self_viewed',
  PERSONA_REVEALED:        'persona_revealed',
  PREDICTION_SHARED:       'prediction_shared',

  // Monetization
  PAYWALL_VIEWED:          'paywall_viewed',
  PAYWALL_DISMISSED:       'paywall_dismissed',
  UPGRADE_TAPPED:          'upgrade_tapped',
  SUBSCRIPTION_ACTIVATED:  'subscription_activated',

  // Retention
  STREAK_ACHIEVED:         (n: number) => `streak_${n}_days`,
  REFERRAL_SHARED:         'referral_shared',
  REFERRAL_APPLIED:        'referral_applied',
} as const;
