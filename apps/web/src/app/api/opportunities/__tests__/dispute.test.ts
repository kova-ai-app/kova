import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
  getAuthWithCompany: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), update: vi.fn() },
  opportunities: {},
  scores: {},
  calls: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }))

import { getAuthWithCompany } from '@/lib/auth'
import { db } from '@kova/db'
import { POST } from '../[id]/dispute/route'
import { NextResponse } from 'next/server'

const MANAGER_CTX = { clerkUserId: 'user-1', orgId: 'org-1', role: 'manager' as const }

function makeRequest(body: object) {
  return new Request('http://localhost/api/opportunities/opp-1/dispute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/opportunities/:id/dispute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
  })

  it('1. manager can dispute an opportunity — returns 200', async () => {
    ;(getAuthWithCompany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { ...MANAGER_CTX, companyId: 'co-1' },
      error: null,
    })
    // Ownership check via two innerJoins (opportunities → scores → calls)
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'opp-1' }]),
          }),
        }),
      }),
    })

    const req = makeRequest({ reason: 'Customer confirmed they did request this service' })
    const res = await POST(req, { params: Promise.resolve({ id: 'opp-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.disputed).toBe(true)
  })

  it('2. technician is forbidden — returns 403', async () => {
    ;(getAuthWithCompany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    })
    const req = makeRequest({ reason: 'some reason' })
    const res = await POST(req, { params: Promise.resolve({ id: 'opp-1' }) })
    expect(res.status).toBe(403)
  })
})
