import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'user-1', orgId: 'org-1' }),
}))
vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn() },
  calls: {},
  users: {},
  companies: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

import { db } from '@kova/db'
import { auth } from '@clerk/nextjs/server'
import { POST } from '../consent/route'

function makeRequest(body: object) {
  return new Request('http://localhost/api/calls/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

describe('POST /api/calls/consent', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Re-apply auth mock after clearAllMocks
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1', orgId: 'org-1' })

    // db.select called twice: first for company lookup, then for user lookup
    ;(db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'co-1' }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'user-db-1' }]),
        }),
      })

    ;(db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'call-db-1',
              consentLoggedAt: '2026-05-12T10:00:00.000Z',
            },
          ]),
        }),
      }),
    })
  })

  it('creates a call record and returns 200', async () => {
    const req = makeRequest({
      sessionId: 'sess-1',
      callId: 'call-1',
      consentedAt: '2026-05-12T10:00:00.000Z',
      devicePlatform: 'ios',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.callId).toBeDefined()
    expect(body.consentLoggedAt).toBeDefined()
  })

  it('returns 401 when unauthenticated', async () => {
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ userId: null, orgId: null })
    const res = await POST(makeRequest({ sessionId: 'sess-1', callId: 'call-1' }))
    expect(res.status).toBe(401)
  })
})
