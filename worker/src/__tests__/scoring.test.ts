import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  calls: {},
  transcripts: {},
  processingCosts: {},
  scores: {},
  opportunities: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('../lib/s3.js', () => ({ downloadChunks: vi.fn() }))
vi.mock('../lib/deepgram.js', () => ({ transcribeAudio: vi.fn() }))
vi.mock('../lib/rules/index.js', () => ({ runRules: vi.fn() }))
vi.mock('../lib/redis.js', () => ({ getRedisClient: vi.fn().mockReturnValue({}) }))
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({ on: vi.fn(), close: vi.fn() })),
}))

import { db } from '@kova/db'
import { downloadChunks } from '../lib/s3.js'
import { transcribeAudio } from '../lib/deepgram.js'
import { runRules } from '../lib/rules/index.js'
import { processTranscription } from '../workers/scoring.js'

const MOCK_CALL = { id: 'call-1', language: 'en', durationSec: 300, jobType: 'drain' }

const MOCK_TRANSCRIPT_RESULT = {
  segments: [
    { speaker: 'speaker_0', text: 'Drain is clogged.', startSec: 0, endSec: 3.5, language: 'en', confidence: 0.95 },
  ],
  language: 'en' as const,
  werConfidence: 0.95,
  durationSec: 300,
  costUsd: 0.0215,
}

const MOCK_RULE_RESULTS = [
  { dimension: 'camera_inspection', triggered: true, offered: false, confidence: 0.95 },
]

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
  })

  it('downloads audio, transcribes, runs rules, and writes transcript + score + opportunities', async () => {
    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 300,
    })

    expect(downloadChunks).toHaveBeenCalledWith(['audio/co-1/sess-1/chunk_0.aac'])
    expect(transcribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
    expect(runRules).toHaveBeenCalledWith(expect.objectContaining({
      segments: MOCK_TRANSCRIPT_RESULT.segments,
      jobType: 'drain',
      language: 'en',
    }))
    // transcript + processingCosts + scores + (1 opportunity per rule result)
    expect(db.insert).toHaveBeenCalledTimes(4)
  })

  it('final call status is scored', async () => {
    const statusUpdates: string[] = []
    const mockSet = vi.fn().mockImplementation((val: Record<string, string>) => {
      if (val.status) statusUpdates.push(val.status)
      return { where: vi.fn().mockResolvedValue(undefined) }
    })
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet })

    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 300,
    })

    expect(statusUpdates[0]).toBe('processing')
    expect(statusUpdates[statusUpdates.length - 1]).toBe('scored')
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
      processTranscription({ callId: 'call-1', s3Keys: ['chunk_0.aac'], totalDurationSec: 300 })
    ).rejects.toThrow('Deepgram transcription failed')

    expect(statusUpdates).toContain('failed')
  })
})
