import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  pricebookItems: {},
  companies: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}))

import { requireRole } from '@/lib/auth'
import { db } from '@kova/db'
import { GET, POST } from '../route'
import { PUT, DELETE } from '../[id]/route'
import { NextResponse } from 'next/server'

const OWNER_CTX = { clerkUserId: 'user-clerk-1', orgId: 'org-1', role: 'owner' as const }

const MOCK_ITEMS = [
  {
    id: 'pb-1',
    companyId: 'comp-1',
    name: 'Camera Inspection',
    trade: 'drain',
    opportunityType: 'camera_inspection',
    pricingModel: 'fixed',
    priceFixed: 199,
    priceLow: null,
    priceHigh: null,
    isRecurring: false,
    ltvAnnual: null,
    ltvYears: null,
    isDefault: true,
    active: true,
    createdAt: new Date('2026-05-01T00:00:00Z'),
  },
]

function mockCompanyLookup(companyId: string | null) {
  ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(
        companyId ? [{ id: companyId }] : []
      ),
    }),
  })
}

function mockPricebookList(items: object[]) {
  const selectMock = vi.fn()
  // First call: company lookup → returns company
  selectMock.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ id: 'comp-1' }]),
    }),
  })
  // Second call: pricebook list → returns items
  selectMock.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(items),
      }),
    }),
  })
  ;(db.select as unknown as ReturnType<typeof vi.fn>) = selectMock
}

describe('Pricebook API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- GET /api/pricebook ---
  it('1. GET returns pricebook items for owner', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    mockPricebookList(MOCK_ITEMS)

    const req = new Request('http://localhost/api/pricebook')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Camera Inspection')
  })

  it('2. GET returns 401 for unauthenticated', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const req = new Request('http://localhost/api/pricebook')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  // --- POST /api/pricebook ---
  it('3. POST creates a pricebook item', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    mockCompanyLookup('comp-1')
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'pb-new', name: 'Custom Jetting' }]),
      }),
    })

    const req = new Request('http://localhost/api/pricebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Custom Jetting',
        trade: 'drain',
        opportunityType: 'hydro_jetting',
        pricingModel: 'fixed',
        priceFixed: 500,
        isRecurring: false,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('pb-new')
  })

  it('4. POST returns 400 for missing name', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)

    const req = new Request('http://localhost/api/pricebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trade: 'drain',
        opportunityType: 'hydro_jetting',
        pricingModel: 'fixed',
        isRecurring: false,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // --- PUT /api/pricebook/:id ---
  it('5. PUT updates a pricebook item', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'pb-1', name: 'Updated Name', priceFixed: 299 }]),
        }),
      }),
    })

    const req = new Request('http://localhost/api/pricebook/pb-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name', priceFixed: 299 }),
    })
    const res = await PUT(req, {
      params: Promise.resolve({ id: 'pb-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Updated Name')
  })

  it('6. PUT returns 401 for unauthenticated', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const req = new Request('http://localhost/api/pricebook/pb-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    })
    const res = await PUT(req, {
      params: Promise.resolve({ id: 'pb-1' }),
    })
    expect(res.status).toBe(401)
  })

  // --- DELETE /api/pricebook/:id ---
  it('7. DELETE soft-deactivates a pricebook item', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const req = new Request('http://localhost/api/pricebook/pb-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, {
      params: Promise.resolve({ id: 'pb-1' }),
    })
    expect(res.status).toBe(204)
  })

  it('8. DELETE returns 401 for unauthenticated', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const req = new Request('http://localhost/api/pricebook/pb-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, {
      params: Promise.resolve({ id: 'pb-1' }),
    })
    expect(res.status).toBe(401)
  })
})
