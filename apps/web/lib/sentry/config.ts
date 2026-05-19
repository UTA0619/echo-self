import * as Sentry from '@sentry/nextjs'

export function initSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: false,
    // Don't send PII — ECHO handles sensitive personal data
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip any memory content from error context
      if (event.extra?.memory_content) {
        delete event.extra.memory_content
      }
      return event
    },
  })
}
