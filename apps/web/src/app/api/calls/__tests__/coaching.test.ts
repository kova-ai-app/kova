import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
  getAuthWithCompany: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  calls: {},
  coachingPoints: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

import { requireRole, getAuthWithCompany } from '@/lib/auth'
import { db } from '@kova/db'
import { POST } from '../[id]/coaching/route'
import { PATCH } from '../../coaching/[id]/route'
import { NextResponse } from 'next/server'

const MANAGER_CTX = {
  clerkUserId: 'user-clerk-1',
  orgId: 'org-1',
  role: 'manager' as const,
}

const MANAGER_WITH_COMPANY = {
  auth: { ...MANAGER_CTX, companyId: 'co-1' },
  error: null,
}

describe('Coaching API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. POST /api/calls/:id/coaching creates a coaching note', async () => {
    ;(getAuthWithCompany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      MANAGER_WITH_COMPANY
    )
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'call-1', techId: 'tech-1' }]),
      }),
    })
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([
            { id: 'cp-1', createdAt: new Date('2026-05-12T10:00:00Z') },
          ]),
      }),
    })

    const req = new Request('http://localhost/api/calls/call-1/coaching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Great job explaining the diagnosis' }),
    })
    const res = await POST(req, {
      params: Promise.resolve({ id: 'call-1' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('cp-1')
  })

  it('2. POST /api/calls/:id/coaching requires text field', async () => {
    ;(getAuthWithCompany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      MANAGER_WITH_COMPANY
    )

    const req = new Request('http://localhost/api/calls/call-1/coaching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req, {
      params: Promise.resolve({ id: 'call-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('3. PATCH /api/coaching/:id marks point as reviewed', async () => {
    ;(getAuthWithCompany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      MANAGER_WITH_COMPANY
    )
    // Ownership check via innerJoin
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'cp-1' }]),
        }),
      }),
    })
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const req = new Request('http://localhost/api/coaching/cp-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: 'cp-1' }),
    })
    expect(res.status).toBe(204)
  })

  it('4. PATCH /api/coaching/:id returns 401 for unauthenticated', async () => {
    ;(getAuthWithCompany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const req = new Request('http://localhost/api/coaching/cp-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: 'cp-1' }),
    })
    expect(res.status).toBe(401)
  })
})
