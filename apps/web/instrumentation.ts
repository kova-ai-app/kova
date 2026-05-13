// ---------------------------------------------------------------------------
// Next.js instrumentation file — server & edge Sentry init
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
// ---------------------------------------------------------------------------
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.APP_ENV ?? 'development',
      tracesSampleRate: process.env.APP_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.APP_ENV === 'development',
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.APP_ENV ?? 'development',
      tracesSampleRate: process.env.APP_ENV === 'production' ? 0.1 : 1.0,
    })
  }
}
