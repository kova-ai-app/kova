import { Worker } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'
import { QUEUE_NAMES, JOB_NAMES, ScoringJobPayloadSchema } from '@kova/shared'
import { db, calls, transcripts, processingCosts, scores, opportunities } from '@kova/db'
import { eq } from 'drizzle-orm'
import { sendCallScoredNotification } from '../lib/push.js'
import { getRedisClient } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'
import { downloadChunks } from '../lib/s3.js'
import { transcribeAudio } from '../lib/deepgram.js'
import { runRules } from '../lib/rules/index.js'
import { analyzeTranscript } from '../lib/llm.js'
import { lookupPrice } from '../lib/pricebook.js'
import { assembleScore } from '../lib/score-assembly.js'
import type { Language, JobType, ScoringDimension } from '@kova/shared'
import type { PriceResult } from '../lib/pricebook.js'
import type { LLMAnalysis } from '../lib/llm.js'

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

  // Step 1: Fetch call from DB
  const [call] = await db
    .select({
      id: calls.id,
      companyId: calls.companyId,
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
    const callJobType = (call.jobType ?? payload.jobType ?? null) as JobType | null
    const ruleResults = runRules({
      segments: transcription.segments,
      jobType: callJobType,
      durationSec: transcription.durationSec ?? payload.totalDurationSec,
      language: transcription.language,
    })
    logger.info({ callId, ruleCount: ruleResults.length }, 'Rules evaluated')

    // Step 8: Look up prices for each rule result dimension
    const priceMap = new Map<string, PriceResult>()
    for (const rr of ruleResults) {
      const price = await lookupPrice(call.companyId, rr.dimension as ScoringDimension)
      priceMap.set(rr.dimension, price)
    }

    // Step 9: LLM qualitative analysis (non-fatal — falls back to rules-only)
    let llmAnalysis: LLMAnalysis | null = null
    try {
      logger.info({ callId }, 'Running LLM qualitative analysis')
      llmAnalysis = await analyzeTranscript(transcription.segments, callJobType, transcription.language)
      await db.insert(processingCosts).values({
        callId,
        provider: 'openai',
        tokensIn: llmAnalysis.tokensIn,
        tokensOut: llmAnalysis.tokensOut,
        costUsd: llmAnalysis.costUsd,
      })
      logger.info({ callId, tokensIn: llmAnalysis.tokensIn }, 'LLM analysis complete')
    } catch (err) {
      logger.warn({ callId, err }, 'LLM analysis failed — falling back to rules-only scoring')
    }

    // Step 10: Assemble final score
    const assembled = assembleScore(ruleResults, llmAnalysis, priceMap)

    // Step 11: Write scores row with real values
    const scoreId = uuidv4()
    await db
      .insert(scores)
      .values({
        id: scoreId,
        callId,
        overallScore: assembled.overallScore,
        dimensions: assembled.dimensions,
        opportunityTotalLow: assembled.opportunityTotalLow,
        opportunityTotalHigh: assembled.opportunityTotalHigh,
        confidenceLevel: assembled.confidenceLevel,
        modelUsed: assembled.modelUsed,
        promptVersion: 'v1',
      })
      .returning({ id: scores.id })

    // Step 12: Write opportunities rows with real prices
    for (const eo of assembled.enrichedOpportunities) {
      await db.insert(opportunities).values({
        scoreId,
        type: eo.dimension,
        triggered: eo.triggered,
        offered: eo.offered,
        pricebookItemId: eo.pricebookItemId ?? undefined,
        valueLow: eo.valueLow,
        valueHigh: eo.valueHigh,
        ltvValue: eo.ltvValue ?? undefined,
        isDefaultPrice: eo.isDefaultPrice,
        confidence: eo.confidence,
        clipStartSec: eo.clipStartSec ?? null,
        clipEndSec: eo.clipEndSec ?? null,
      })
    }

    // Step 13: Mark call as scored, link transcript + score
    await db
      .update(calls)
      .set({ status: 'scored', transcriptId, scoreId })
      .where(eq(calls.id, callId))

    logger.info(
      { callId, transcriptId, scoreId, overallScore: assembled.overallScore, modelUsed: assembled.modelUsed },
      'Scoring complete'
    )

    // Send push notification to the technician (non-fatal)
    try {
      const [callRecord] = await db
        .select({ techId: calls.techId })
        .from(calls)
        .where(eq(calls.id, callId))
      if (callRecord?.techId) {
        await sendCallScoredNotification(callId, callRecord.techId)
      }
    } catch (err) {
      logger.warn({ err, callId }, 'Push notification failed — non-fatal')
    }
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

    return { callId: payload.callId, status: 'scored' }
  },
  {
    connection: getRedisClient(),
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
)
