// ---------------------------------------------------------------------------
// Next.js client instrumentation file — client-side Sentry init
// Replaces sentry.client.config.ts (Turbopack compatible)
// ---------------------------------------------------------------------------
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.APP_ENV ?? 'development',
  tracesSampleRate: process.env.APP_ENV === 'production' ? 0.1 : 1.0,
  debug: process.env.APP_ENV === 'development',
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
})
