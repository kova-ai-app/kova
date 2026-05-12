import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))
vi.mock('@/lib/dashboard', () => ({
  getDashboardData: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: { select: vi.fn() },
  companies: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))
vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => fn,
}))

import { requireRole } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard'
import { db } from '@kova/db'
import { GET } from '../summary/route'
import { NextResponse } from 'next/server'

const OWNER_CTX = { clerkUserId: 'user-clerk-1', orgId: 'org-1', role: 'owner' as const }

const MOCK_SUMMARY = {
  opportunityTotalLow: 1500,
  opportunityTotalHigh: 2500,
  opportunityChangePct: 23,
  cumulativeTotal: 15000,
  topOpportunityTypes: [
    { type: 'camera_inspection', totalValue: 800 },
    { type: 'hydro_jetting', totalValue: 600 },
  ],
  pricebookCompletionPct: 45,
}

describe('GET /api/dashboard/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. owner gets dashboard summary for their company', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'comp-1' }]),
      }),
    })
    ;(getDashboardData as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_SUMMARY)

    const req = new Request('http://localhost/api/dashboard/summary')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.opportunityTotalLow).toBe(1500)
    expect(body.opportunityTotalHigh).toBe(2500)
    expect(body.topOpportunityTypes).toHaveLength(2)
    expect(body.pricebookCompletionPct).toBe(45)
  })

  it('2. unauthenticated request returns 401', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const req = new Request('http://localhost/api/dashboard/summary')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('3. company not found returns 404', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const req = new Request('http://localhost/api/dashboard/summary')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })
})
