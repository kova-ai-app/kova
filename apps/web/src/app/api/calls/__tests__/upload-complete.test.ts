import { describe, it, expect, vi, beforeEach } from 'vitest'

const addMock = vi.fn().mockResolvedValue({ id: 'job-1' })

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'user-1', orgId: 'org-1' }),
}))
vi.mock('@kova/db', () => ({ db: { select: vi.fn(), update: vi.fn() }, calls: {}, companies: {}, users: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: addMock,
  })),
}))

import { db } from '@kova/db'
import { auth } from '@clerk/nextjs/server'
import { POST } from '../upload-complete/route'

function makeRequest(body: object) {
  return new Request('http://localhost/api/calls/upload-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

describe('POST /api/calls/upload-complete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.REDIS_URL = 'redis://localhost:6379'
    addMock.mockResolvedValue({ id: 'job-1' })

    // Re-apply auth mock after clearAllMocks
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1', orgId: 'org-1' })

    // db.select for company lookup
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'co-1' }]),
      }),
    })

    ;(db.update as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
  })

  it('enqueues a BullMQ job and returns 202', async () => {
    const req = makeRequest({
      callId: 'call-1',
      sessionId: 'sess-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 300,
      chunkCount: 1,
      jobMetadata: { jobType: 'drain' },
      devicePlatform: 'ios',
      audioFormat: 'aac-lc',
      audioBitrateKbps: 32,
    })
    const res = await POST(req)
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.callId).toBe('call-1')
    expect(body.status).toBe('pending')
    expect(addMock).toHaveBeenCalledWith(
      'score-call',
      {
        callId: 'call-1',
        s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
        totalDurationSec: 300,
        jobType: 'drain',
      },
      expect.objectContaining({
        jobId: 'call-1',
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      })
    )
  })

  it('returns 202 when BullMQ reports the scoring job already exists', async () => {
    const duplicateJobError = Object.assign(new Error('duplicate job'), {
      code: 'EJOBIDEXISTS',
    })
    addMock.mockRejectedValueOnce(duplicateJobError)

    const req = makeRequest({
      callId: 'call-1',
      sessionId: 'sess-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 300,
      chunkCount: 1,
      jobMetadata: { jobType: 'drain' },
      devicePlatform: 'ios',
      audioFormat: 'aac-lc',
      audioBitrateKbps: 32,
    })

    const res = await POST(req)

    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.callId).toBe('call-1')
    expect(body.status).toBe('pending')
  })

  it('returns 500 when enqueue fails for a non-duplicate reason', async () => {
    addMock.mockRejectedValueOnce(new Error('redis unavailable'))

    const req = makeRequest({
      callId: 'call-1',
      sessionId: 'sess-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 300,
      chunkCount: 1,
      jobMetadata: { jobType: 'drain' },
      devicePlatform: 'ios',
      audioFormat: 'aac-lc',
      audioBitrateKbps: 32,
    })

    const res = await POST(req)

    expect(res.status).toBe(500)
  })
})
