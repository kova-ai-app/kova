import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn().mockImplementation((params) => ({ input: params })),
}))
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue(
    'https://s3.amazonaws.com/kova-audio-dev/audio/co-1/sess-1/chunk_0.aac?X-Amz-Signature=abc'
  ),
}))
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({
    userId: 'user-1',
    orgId: 'org-1',
    sessionClaims: { org_id: 'org-1' },
  }),
}))
vi.mock('@kova/db', () => ({
  db: {
    select: vi.fn(),
  },
  companies: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

import { db } from '@kova/db'
import { auth } from '@clerk/nextjs/server'
import { GET } from '../upload-url/route'

function makeRequest(searchParams: Record<string, string>) {
  const url = new URL('http://localhost/api/calls/upload-url')
  for (const [k, v] of Object.entries(searchParams)) {
    url.searchParams.set(k, v)
  }
  return new Request(url.toString()) as any
}

describe('GET /api/calls/upload-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.S3_BUCKET_NAME = 'kova-audio-dev'
    process.env.AWS_REGION = 'us-east-1'
    process.env.AWS_ACCESS_KEY_ID = 'test-key'
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret'

    // Re-apply auth mock after clearAllMocks
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
    })

    // Set up db.select mock
    ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'co-1' }]),
      }),
    })
  })

  it('returns a presigned URL and s3Key', async () => {
    const req = makeRequest({
      sessionId: 'sess-1',
      chunkIndex: '0',
      contentType: 'audio/aac',
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.presignedUrl).toContain('s3.amazonaws.com')
    expect(body.s3Key).toBe('audio/co-1/sess-1/chunk_0.aac')
    expect(body.expiresIn).toBe(900)
  })

  it('returns 400 when sessionId is missing', async () => {
    const req = makeRequest({ chunkIndex: '0', contentType: 'audio/aac' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ userId: null, orgId: null })
    const req = makeRequest({ sessionId: 'sess-1', chunkIndex: '0', contentType: 'audio/aac' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
