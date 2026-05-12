import { Worker } from 'bullmq'
import { QUEUE_NAMES, JOB_NAMES, ScoringJobPayloadSchema } from '@kova/shared'
import { getRedisClient } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'

const logger = createLogger('scoring-worker')

// ---------------------------------------------------------------------------
// Scoring Worker
// Queue: "scoring"
// Job: "score-call"
//
// Pipeline (Week 4–6):
//   1. Download audio chunks from S3
//   2. Deepgram Nova-3 transcription
//   3. Rules engine (EN + ES)
//   4. GPT-5.4-mini analysis
//   5. Score assembly + pricebook lookup
//   6. Write results to Neon
//   7. Send push notification via Expo Push
// ---------------------------------------------------------------------------

export const scoringWorker = new Worker(
  QUEUE_NAMES.SCORING,
  async (job) => {
    if (job.name !== JOB_NAMES.SCORE_CALL) {
      logger.warn({ jobName: job.name }, 'Unknown job name — skipping')
      return
    }

    // Validate payload
    const payload = ScoringJobPayloadSchema.parse(job.data)
    logger.info({ callId: payload.callId }, 'Processing scoring job')

    // -----------------------------------------------------------------------
    // TODO Week 4: Download audio from S3
    // -----------------------------------------------------------------------
    logger.info({ callId: payload.callId }, 'Step 1: Download audio (TODO Week 4)')

    // -----------------------------------------------------------------------
    // TODO Week 4: Transcribe with Deepgram Nova-3 Multilingual
    // -----------------------------------------------------------------------
    logger.info({ callId: payload.callId }, 'Step 2: Transcribe (TODO Week 4)')

    // -----------------------------------------------------------------------
    // TODO Week 5: Rules engine
    // -----------------------------------------------------------------------
    logger.info({ callId: payload.callId }, 'Step 3: Rules engine (TODO Week 5)')

    // -----------------------------------------------------------------------
    // TODO Week 6: GPT-5.4-mini scoring
    // -----------------------------------------------------------------------
    logger.info({ callId: payload.callId }, 'Step 4: LLM scoring (TODO Week 6)')

    // -----------------------------------------------------------------------
    // TODO Week 6: Score assembly + pricebook lookup
    // -----------------------------------------------------------------------
    logger.info({ callId: payload.callId }, 'Step 5: Score assembly (TODO Week 6)')

    // -----------------------------------------------------------------------
    // TODO Week 6: Write to Neon
    // -----------------------------------------------------------------------
    logger.info({ callId: payload.callId }, 'Step 6: Write to Neon (TODO Week 6)')

    // -----------------------------------------------------------------------
    // TODO Week 7: Send push notification
    // -----------------------------------------------------------------------
    logger.info({ callId: payload.callId }, 'Step 7: Push notification (TODO Week 7)')

    logger.info({ callId: payload.callId }, 'Scoring job scaffold complete')
    return { callId: payload.callId, status: 'scaffold' }
  },
  {
    connection: getRedisClient(),
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
)
