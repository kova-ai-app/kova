import { describe, it, expect, vi, beforeEach } from 'vitest'

// All external dependencies are mocked before imports
vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  calls: {},
  transcripts: {},
  processingCosts: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('../lib/s3.js', () => ({
  downloadChunks: vi.fn(),
}))
vi.mock('../lib/deepgram.js', () => ({
  transcribeAudio: vi.fn(),
}))
vi.mock('../lib/redis.js', () => ({
  getRedisClient: vi.fn().mockReturnValue({}),
}))
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
}))

import { db } from '@kova/db'
import { downloadChunks } from '../lib/s3.js'
import { transcribeAudio } from '../lib/deepgram.js'
import { processTranscription } from '../workers/scoring.js'

const MOCK_CALL = {
  id: 'call-1',
  language: 'en',
  durationSec: 300,
}

const MOCK_TRANSCRIPT_RESULT = {
  segments: [
    { speaker: 'speaker_0', text: 'Hello, drain is clogged.', startSec: 0, endSec: 3.5, language: 'en', confidence: 0.95 },
  ],
  language: 'en' as const,
  werConfidence: 0.95,
  durationSec: 300,
  costUsd: 0.0215,
}

describe('processTranscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // db.select: first call = fetch the call record
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([MOCK_CALL]),
      }),
    })

    // db.update: update call status
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    // db.insert: insert transcript + processingCosts
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'transcript-1' }]),
      }),
    })

    ;(downloadChunks as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      Buffer.from('fake-audio')
    )
    ;(transcribeAudio as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      MOCK_TRANSCRIPT_RESULT
    )
  })

  it('downloads audio, transcribes, and writes transcript to DB', async () => {
    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 300,
    })

    expect(downloadChunks).toHaveBeenCalledWith(['audio/co-1/sess-1/chunk_0.aac'])
    expect(transcribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
    expect(db.insert).toHaveBeenCalledTimes(2) // transcript + processingCosts
    expect(db.update).toHaveBeenCalledTimes(2) // status=processing + status=transcribed
  })

  it('sets call status to processing before transcribing', async () => {
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
    expect(statusUpdates[1]).toBe('transcribed')
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
      processTranscription({
        callId: 'call-1',
        s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
        totalDurationSec: 300,
      })
    ).rejects.toThrow('Deepgram transcription failed')

    expect(statusUpdates).toContain('failed')
  })
})
