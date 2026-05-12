import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: { select: vi.fn() },
  calls: {},
  scores: {},
  users: {},
  companies: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn().mockReturnValue('count(*)'),
}))

import { requireRole } from '@/lib/auth'
import { db } from '@kova/db'
import { GET } from '../route'
import { NextResponse } from 'next/server'

const OWNER_CTX = { clerkUserId: 'user-clerk-1', orgId: 'org-1', role: 'owner' as const }
const TECH_CTX = { clerkUserId: 'user-clerk-2', orgId: 'org-1', role: 'technician' as const }

const MOCK_CALLS = [
  {
    id: 'call-1',
    techId: 'tech-1',
    techName: 'John Smith',
    recordedAt: new Date('2026-05-12T10:00:00Z'),
    durationSec: 600,
    status: 'scored',
    jobType: 'drain',
    customerName: 'Jane Smith',
    overallScore: 72,
    opportunityTotalLow: 425,
    opportunityTotalHigh: 425,
  },
]

function mockSelectChain(result: object[]) {
  ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(result),
              }),
            }),
          }),
        }),
      }),
      where: vi.fn().mockResolvedValue([{ count: result.length }]),
    }),
  })
}

describe('GET /api/calls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. owner gets paginated call list for their company', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    mockSelectChain(MOCK_CALLS)

    const req = new Request('http://localhost/api/calls?page=0')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('call-1')
    expect(body.nextPage === null || typeof body.nextPage === 'number').toBe(true)
  })

  it('2. unauthenticated request returns 401', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const req = new Request('http://localhost/api/calls')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('3. technician role is accepted (route allows all roles)', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(TECH_CTX)
    mockSelectChain([])

    const req = new Request('http://localhost/api/calls?page=0')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('4. filter by jobType returns 200 with filtered results', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    mockSelectChain(MOCK_CALLS)

    const req = new Request('http://localhost/api/calls?page=0&jobType=drain')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })

  it('5. response includes techName from users join', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    mockSelectChain(MOCK_CALLS)

    const req = new Request('http://localhost/api/calls?page=0')
    const res = await GET(req)
    const body = await res.json()
    expect(body.data[0]).toHaveProperty('techName', 'John Smith')
  })
})
