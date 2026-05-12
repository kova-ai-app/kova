import pino from 'pino'

export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL ?? 'info',
    ...(process.env.APP_ENV !== 'production'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  })
}
