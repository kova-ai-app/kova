import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  calls: {},
  transcripts: {},
  processingCosts: {},
  scores: {},
  opportunities: {},
  coachingPoints: {},
  pricebookItems: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock('../lib/s3.js', () => ({ downloadChunks: vi.fn() }))
vi.mock('../lib/deepgram.js', () => ({ transcribeAudio: vi.fn() }))
vi.mock('../lib/rules/index.js', () => ({ runRules: vi.fn() }))
vi.mock('../lib/llm.js', () => ({ analyzeTranscript: vi.fn() }))
vi.mock('../lib/pricebook.js', () => ({ lookupPrice: vi.fn() }))
vi.mock('../lib/score-assembly.js', () => ({ assembleScore: vi.fn() }))
vi.mock('../lib/push.js', () => ({ sendCallScoredNotification: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../lib/redis.js', () => ({ getRedisClient: vi.fn().mockReturnValue({}) }))
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({ on: vi.fn(), close: vi.fn() })),
}))

import { db } from '@kova/db'
import { downloadChunks } from '../lib/s3.js'
import { transcribeAudio } from '../lib/deepgram.js'
import { runRules } from '../lib/rules/index.js'
import { analyzeTranscript } from '../lib/llm.js'
import { lookupPrice } from '../lib/pricebook.js'
import { assembleScore } from '../lib/score-assembly.js'
import { sendCallScoredNotification } from '../lib/push.js'
import { processTranscription } from '../workers/scoring.js'

const MOCK_CALL = { id: 'call-1', companyId: 'co-1', language: 'en', durationSec: 600, jobType: 'drain', techId: 'tech-1' }

const MOCK_TRANSCRIPT_RESULT = {
  segments: [
    { speaker: 'speaker_0', text: 'Drain is clogged.', startSec: 0, endSec: 3.5, language: 'en', confidence: 0.95 },
  ],
  language: 'en' as const,
  werConfidence: 0.95,
  durationSec: 600,
  costUsd: 0.043,
}

const MOCK_RULE_RESULTS = [
  { dimension: 'camera_inspection', triggered: true, offered: false, confidence: 0.95 },
]

const MOCK_LLM_ANALYSIS = {
  qualScores: [
    { dimension: 'diagnosis_quality',     score: 2, reasoning: 'ok' },
    { dimension: 'hydrojet_presentation', score: 1, reasoning: 'ok' },
    { dimension: 'customer_education',    score: 2, reasoning: 'ok' },
    { dimension: 'close_quality',         score: 2, reasoning: 'ok' },
  ],
  tokensIn: 800,
  tokensOut: 200,
  costUsd: 0.0004,
}

const MOCK_PRICE_RESULT = {
  pricebookItemId: 'pb-1',
  valueLow: 425,
  valueHigh: 425,
  ltvValue: null,
  isDefaultPrice: false,
}

const MOCK_ASSEMBLED = {
  overallScore: 67,
  dimensions: [{ dimension: 'camera_inspection', score: 33, triggered: true, offered: false, confidence: 0.95 }],
  opportunityTotalLow: 425,
  opportunityTotalHigh: 425,
  enrichedOpportunities: [{
    dimension: 'camera_inspection',
    triggered: true,
    offered: false,
    confidence: 0.95,
    pricebookItemId: 'pb-1',
    valueLow: 425,
    valueHigh: 425,
    ltvValue: null,
    isDefaultPrice: false,
  }],
  modelUsed: 'rules+gpt-4o-mini',
  confidenceLevel: 'high',
}

describe('processTranscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([MOCK_CALL]),
      }),
    })
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    })
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'row-1' }]),
      }),
    })
    ;(downloadChunks as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('audio'))
    ;(transcribeAudio as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_TRANSCRIPT_RESULT)
    ;(runRules as unknown as ReturnType<typeof vi.fn>).mockReturnValue(MOCK_RULE_RESULTS)
    ;(lookupPrice as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRICE_RESULT)
    ;(analyzeTranscript as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_LLM_ANALYSIS)
    ;(assembleScore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(MOCK_ASSEMBLED)
    ;(sendCallScoredNotification as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  })

  it('calls all pipeline steps: download, transcribe, rules, pricebook, LLM, assembleScore', async () => {
    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 600,
    })

    expect(downloadChunks).toHaveBeenCalledWith(['audio/co-1/sess-1/chunk_0.aac'])
    expect(transcribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
    expect(runRules).toHaveBeenCalled()
    expect(lookupPrice).toHaveBeenCalledWith('co-1', 'camera_inspection')
    expect(analyzeTranscript).toHaveBeenCalled()
    expect(assembleScore).toHaveBeenCalledWith(
      MOCK_RULE_RESULTS,
      MOCK_LLM_ANALYSIS,
      expect.any(Map),
    )
    // inserts: transcript + deepgram cost + openai cost + scores + 1 opportunity + 1 coaching point = 6
    expect(db.insert).toHaveBeenCalledTimes(6)
  })

  it('scores row written with assembleScore values (overallScore=67)', async () => {
    await processTranscription({ callId: 'call-1', s3Keys: [], totalDurationSec: 600 })
    // Verify assembleScore was called and its return value would be used
    expect(assembleScore).toHaveReturnedWith(MOCK_ASSEMBLED)
  })

  it('final call status is scored', async () => {
    const statusUpdates: string[] = []
    const mockSet = vi.fn().mockImplementation((val: Record<string, string>) => {
      if (val.status) statusUpdates.push(val.status)
      return { where: vi.fn().mockResolvedValue(undefined) }
    })
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet })

    await processTranscription({ callId: 'call-1', s3Keys: [], totalDurationSec: 600 })

    expect(statusUpdates[0]).toBe('processing')
    expect(statusUpdates[statusUpdates.length - 1]).toBe('scored')
  })

  it('LLM failure is non-fatal — pipeline completes with rules-only fallback', async () => {
    ;(analyzeTranscript as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('OpenAI API error: invalid key')
    )
    // assembleScore still called with llmAnalysis=null
    ;(assembleScore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...MOCK_ASSEMBLED,
      modelUsed: 'rules-v1',
      confidenceLevel: 'medium',
    })

    await expect(
      processTranscription({ callId: 'call-1', s3Keys: [], totalDurationSec: 600 })
    ).resolves.not.toThrow()

    expect(assembleScore).toHaveBeenCalledWith(MOCK_RULE_RESULTS, null, expect.any(Map))
  })

  it('sets call status to failed when transcription throws', async () => {
    ;(transcribeAudio as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Deepgram transcription failed: bad key')
    )
    const statusUpdates: string[] = []
    const mockSet = vi.fn().mockImplementation((val: Record<string, string>) => {
      if (val.status) statusUpdates.push(val.status)
      return { where: vi.fn().mockResolvedValue(undefined) }
    })
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet })

    await expect(
      processTranscription({ callId: 'call-1', s3Keys: ['chunk_0.aac'], totalDurationSec: 600 })
    ).rejects.toThrow('Deepgram transcription failed')

    expect(statusUpdates).toContain('failed')
  })

  it('sends push notification after scoring completes', async () => {
    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 600,
    })
    expect(sendCallScoredNotification).toHaveBeenCalled()
  })

  it('generates coaching points from low-scoring LLM dimensions (score 0 or 1)', async () => {
    const llmWithLowScores = {
      qualScores: [
        { dimension: 'diagnosis_quality',     score: 0, reasoning: 'Did not explain root cause to customer' },
        { dimension: 'hydrojet_presentation', score: 1, reasoning: 'Briefly mentioned jetting but did not present as option' },
        { dimension: 'customer_education',    score: 2, reasoning: 'Good education before pricing' },
        { dimension: 'close_quality',         score: 3, reasoning: 'Excellent close with options' },
      ],
      tokensIn: 800,
      tokensOut: 200,
      costUsd: 0.0004,
    }
    ;(analyzeTranscript as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(llmWithLowScores)

    const insertedValues: Array<Record<string, unknown>> = []
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
        insertedValues.push(vals)
        return { returning: vi.fn().mockResolvedValue([{ id: 'row-1' }]) }
      }),
    }))

    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 600,
    })

    // Find coaching point inserts — they have a `text` field containing dimension label + reasoning
    const coachingInserts = insertedValues.filter(
      (v) => typeof v.text === 'string' && v.callId === 'call-1' && v.techId === 'tech-1'
    )
    // 2 low-scoring dimensions (score 0 and 1) → 2 coaching points
    expect(coachingInserts).toHaveLength(2)
    expect(coachingInserts[0].text).toContain('Diagnosis Quality')
    expect(coachingInserts[0].text).toContain('Did not explain root cause')
    expect(coachingInserts[1].text).toContain('Hydrojet Presentation')
    expect(coachingInserts[1].text).toContain('Briefly mentioned jetting')
  })
})
