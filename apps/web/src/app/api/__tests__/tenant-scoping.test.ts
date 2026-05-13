import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getAuthWithCompany: vi.fn().mockResolvedValue({
    auth: { clerkUserId: 'user-1', orgId: 'org-1', role: 'owner', companyId: 'company-1' },
    error: null,
  }),
  requireRole: vi.fn().mockResolvedValue({
    clerkUserId: 'user-1',
    orgId: 'org-1',
    role: 'owner',
  }),
}))
vi.mock('@/lib/api-handler', () => ({
  withErrorHandler: (fn: any) => fn,
}))
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockReturnValue({ userId: 'user-1', orgId: 'org-1', orgRole: 'org:admin' }),
}))

const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockUpdate = vi.fn()
const mockSet = vi.fn()

vi.mock('@kova/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue([]) }),
    }),
    query: {
      companies: { findFirst: vi.fn().mockResolvedValue({ id: 'company-1' }) },
    },
  },
  calls: { id: 'calls.id', companyId: 'calls.companyId' },
  scores: {},
  transcripts: {},
  opportunities: { id: 'opp.id', callId: 'opp.callId' },
  feedback: { id: 'cp.id', callId: 'cp.callId' },
  pricebookItems: { id: 'pi.id', companyId: 'pi.companyId', active: 'pi.active' },
  companies: {},
  eq: vi.fn((a, b) => `${String(a)}=${String(b)}`),
  and: vi.fn((...args: string[]) => args.join(' AND ')),
}))

import { NextRequest } from 'next/server'

describe('Tenant Scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockResolvedValue([]) // empty = not found for this company
  })

  it('calls/[id] GET returns 404 when call not found for this company', async () => {
    const { GET } = await import('../calls/[id]/route')
    const req = new NextRequest('http://localhost/api/calls/other-company-call')
    const res = await GET(req, { params: Promise.resolve({ id: 'other-company-call' }) })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/not found/i)
  })

  it('pricebook/[id] PUT returns 404 when item not found for this company', async () => {
    mockUpdate.mockReturnValue({ set: mockSet })
    mockSet.mockReturnValue({ where: mockWhere })

    const { PUT } = await import('../pricebook/[id]/route')
    const req = new NextRequest('http://localhost/api/pricebook/other-company-item', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Item',
        trade: 'drain',
        opportunityType: 'hydro_jetting',
        pricingModel: 'fixed',
        priceFixed: 500,
      }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: 'other-company-item' }) })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/not found/i)
  })
})
