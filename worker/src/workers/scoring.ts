import { Worker } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'
import { QUEUE_NAMES, JOB_NAMES, ScoringJobPayloadSchema } from '@kova/shared'
import { db, calls, transcripts, processingCosts, scores, opportunities } from '@kova/db'
import { eq } from 'drizzle-orm'
import { getRedisClient } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'
import { downloadChunks } from '../lib/s3.js'
import { transcribeAudio } from '../lib/deepgram.js'
import { runRules } from '../lib/rules/index.js'
import type { Language, JobType } from '@kova/shared'

const logger = createLogger('scoring-worker')

// ---------------------------------------------------------------------------
// processTranscription — exported for unit testing
// ---------------------------------------------------------------------------

export async function processTranscription(payload: {
  callId: string
  s3Keys: string[]
  totalDurationSec: number
  jobType?: string
}): Promise<void> {
  const { callId, s3Keys } = payload

  // Step 1: Fetch call from DB to get language hint and jobType
  const [call] = await db
    .select({
      id: calls.id,
      language: calls.language,
      durationSec: calls.durationSec,
      jobType: calls.jobType,
    })
    .from(calls)
    .where(eq(calls.id, callId))

  if (!call) {
    throw new Error(`Call not found: ${callId}`)
  }

  // Step 2: Mark call as processing
  await db.update(calls).set({ status: 'processing' }).where(eq(calls.id, callId))

  try {
    // Step 3: Download audio chunks from S3
    logger.info({ callId, chunkCount: s3Keys.length }, 'Downloading audio chunks')
    const audioBuffer = await downloadChunks(s3Keys)

    // Step 4: Transcribe with Deepgram Nova-3 Multilingual
    logger.info({ callId }, 'Transcribing with Deepgram Nova-3 Multilingual')
    const transcription = await transcribeAudio(audioBuffer, call.language as Language)

    // Step 5: Write transcript record
    const transcriptId = uuidv4()
    await db
      .insert(transcripts)
      .values({
        id: transcriptId,
        callId,
        segments: transcription.segments,
        language: transcription.language,
        werConfidence: transcription.werConfidence,
        provider: 'deepgram',
        model: 'nova-3-multilingual',
      })
      .returning({ id: transcripts.id })

    // Step 6: Write transcription processing cost
    await db.insert(processingCosts).values({
      callId,
      provider: 'deepgram',
      tokensIn: null,
      tokensOut: null,
      costUsd: transcription.costUsd,
    })

    // Step 7: Run rules engine
    logger.info({ callId }, 'Running rules engine')
    const ruleResults = runRules({
      segments: transcription.segments,
      jobType: (call.jobType ?? payload.jobType ?? null) as JobType | null,
      durationSec: transcription.durationSec || payload.totalDurationSec,
      language: transcription.language,
    })
    logger.info({ callId, ruleCount: ruleResults.length }, 'Rules evaluated')

    // Step 8: Write scores row (rules-only pass; LLM overwrites in Week 6)
    const scoreId = uuidv4()
    await db
      .insert(scores)
      .values({
        id: scoreId,
        callId,
        overallScore: 0,
        dimensions: [],
        opportunityTotalLow: 0,
        opportunityTotalHigh: 0,
        confidenceLevel: 'high',
        modelUsed: 'rules-v1',
        promptVersion: 'v1',
      })
      .returning({ id: scores.id })

    // Step 9: Write opportunities rows (one per rule result)
    for (const rr of ruleResults) {
      await db.insert(opportunities).values({
        scoreId,
        type: rr.dimension,
        triggered: rr.triggered,
        offered: rr.offered,
        valueLow: 0,
        valueHigh: 0,
        isDefaultPrice: true,
        confidence: rr.confidence,
        clipStartSec: rr.clipStartSec ?? null,
        clipEndSec: rr.clipEndSec ?? null,
      })
    }

    // Step 10: Mark call as transcribed → scored, link transcript + score
    await db
      .update(calls)
      .set({ status: 'scored', transcriptId, scoreId })
      .where(eq(calls.id, callId))

    logger.info(
      { callId, transcriptId, scoreId, language: transcription.language },
      'Scoring complete (rules pass)'
    )
  } catch (err) {
    await db.update(calls).set({ status: 'failed' }).where(eq(calls.id, callId))
    throw err
  }
}

// ---------------------------------------------------------------------------
// Scoring Worker
// ---------------------------------------------------------------------------

export const scoringWorker = new Worker(
  QUEUE_NAMES.SCORING,
  async (job) => {
    if (job.name !== JOB_NAMES.SCORE_CALL) {
      logger.warn({ jobName: job.name }, 'Unknown job name — skipping')
      return
    }

    const payload = ScoringJobPayloadSchema.parse(job.data)
    logger.info({ callId: payload.callId }, 'Processing scoring job')

    await processTranscription(payload)

    // TODO Week 6: LLM scoring + score assembly + pricebook lookup
    logger.info({ callId: payload.callId }, 'LLM scoring (TODO Week 6)')

    // TODO Week 7: Send push notification
    logger.info({ callId: payload.callId }, 'Push notification (TODO Week 7)')

    return { callId: payload.callId, status: 'scored' }
  },
  {
    connection: getRedisClient(),
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
)
