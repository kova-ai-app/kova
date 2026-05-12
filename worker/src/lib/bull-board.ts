import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import express from 'express'
import { Queue } from 'bullmq'
import { QUEUE_NAMES } from '@kova/shared'
import { getRedisClient } from './redis.js'
import { createLogger } from './logger.js'

const logger = createLogger('bull-board')
const BULL_BOARD_PORT = parseInt(process.env.BULL_BOARD_PORT ?? '3001', 10)

export function startBullBoard(): void {
  const scoringQueue = new Queue(QUEUE_NAMES.SCORING, {
    connection: getRedisClient(),
  })

  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/bull-board')

  createBullBoard({
    queues: [new BullMQAdapter(scoringQueue)],
    serverAdapter,
  })

  const app = express()
  app.use('/bull-board', serverAdapter.getRouter())
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))

  app.listen(BULL_BOARD_PORT, () => {
    logger.info(
      { port: BULL_BOARD_PORT },
      `Bull Board running at http://localhost:${BULL_BOARD_PORT}/bull-board`
    )
  })
}
