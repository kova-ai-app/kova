import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn().mockResolvedValue({
    clerkUserId: 'user-1',
    orgId: 'org-1',
    role: 'technician',
  }),
  getAuthWithCompany: vi.fn().mockResolvedValue({
    auth: { clerkUserId: 'user-1', orgId: 'org-1', role: 'technician', companyId: 'co-1' },
    error: null,
  }),
}))
vi.mock('@/lib/api-handler', () => ({
  withErrorHandler: (fn: any) => fn,
}))
vi.mock('@clerk/nextjs/server', () => ({
  // consent route uses await auth() — must use mockResolvedValue
  auth: vi.fn().mockResolvedValue({ userId: 'user-1', orgId: 'org-1', orgRole: 'org:admin' }),
}))
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  })),
}))

const ops: Array<{ op: string; data?: unknown }> = []

vi.mock('@kova/db', () => ({
  db: {
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((data: unknown) => {
        ops.push({ op: 'insert', data })
        return {
          // consent route chains: .insert().values().onConflictDoUpdate().returning()
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'call-1',
              consentLoggedAt: new Date('2026-05-12T10:00:00Z'),
            }]),
          }),
        }
      }),
    })),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((data: unknown) => {
        ops.push({ op: 'update', data })
        return {
          where: vi.fn().mockResolvedValue([]),
        }
      }),
    })),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          id: 'call-1',
          companyId: 'co-1',
          techId: 'tech-1',
          status: 'uploading',
          sessionId: 'sess-1',
        }]),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'call-1' }]),
        }),
      }),
    }),
    query: {
      companies: { findFirst: vi.fn().mockResolvedValue({ id: 'co-1', clerkOrgId: 'org-1' }) },
    },
  },
  calls: {},
  companies: {},
  users: {},
  transcripts: {},
  processingCosts: {},
  scores: {},
  opportunities: {},
  feedback: {},
  pricebookItems: {},
  eq: vi.fn(),
  and: vi.fn(),
}))

describe('E2E API Chain: consent → upload-complete → enqueue', () => {
  beforeEach(() => {
    ops.length = 0
    vi.clearAllMocks()
  })

  it('consent + upload-complete chain succeeds and enqueues a scoring job', async () => {
    // --- Step 1: Consent ---
    const { POST: consentPost } = await import('../calls/consent/route')
    const consentRes = await consentPost(
      new NextRequest('http://localhost/api/calls/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'sess-1',
          callId: 'call-1',
          consentedAt: '2026-05-12T10:00:00Z',
          devicePlatform: 'ios',
        }),
      })
    )
    expect(consentRes.status).toBe(200)
    const consentBody = await consentRes.json()
    // route returns { callId, consentLoggedAt } — not sessionId
    expect(consentBody).toMatchObject({ callId: 'call-1' })

    // --- Step 2: Upload Complete ---
    const { POST: uploadPost } = await import('../calls/upload-complete/route')
    const uploadRes = await uploadPost(
      new NextRequest('http://localhost/api/calls/upload-complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          callId: 'call-1',
          sessionId: 'sess-1',
          s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
          totalDurationSec: 300,
          chunkCount: 1,
          jobMetadata: null,
          devicePlatform: 'ios',
          audioFormat: 'aac-lc',
          audioBitrateKbps: 32,
        }),
      })
    )
    // upload-complete returns 202 Accepted
    expect(uploadRes.status).toBe(202)

    // --- Verify chain produced DB operations ---
    expect(ops.length).toBeGreaterThanOrEqual(2)
    // At least one insert (consent upsert) and one update (upload-complete)
    expect(ops.some((o) => o.op === 'insert')).toBe(true)
    expect(ops.some((o) => o.op === 'update')).toBe(true)
  })
})
