import { createClient } from './lib/redis.js'
import { createLogger } from './lib/logger.js'
import { scoringWorker } from './workers/scoring.js'

const logger = createLogger('worker')

async function main() {
  logger.info('Kova worker starting...')

  const redis = createClient()

  // Health check
  await redis.ping()
  logger.info('Redis connected')

  // Start workers
  scoringWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Scoring job completed')
  })

  scoringWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Scoring job failed')
  })

  logger.info('Worker ready. Waiting for jobs...')

  // Graceful shutdown
  async function shutdown() {
    logger.info('Shutting down worker...')
    await scoringWorker.close()
    await redis.quit()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('Worker failed to start:', err)
  process.exit(1)
})
