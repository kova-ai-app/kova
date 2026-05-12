import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), update: vi.fn() },
  companies: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

import { requireRole } from '@/lib/auth'
import { db } from '@kova/db'
import { GET, PATCH } from '../route'
import { NextResponse } from 'next/server'

const OWNER_CTX = { clerkUserId: 'user-clerk-1', orgId: 'org-1', role: 'owner' as const }

describe('Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. GET returns company profile', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'comp-1', name: 'Drain Right', state: 'CA', plan: 'pilot' },
        ]),
      }),
    })

    const req = new Request('http://localhost/api/settings')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Drain Right')
    expect(body.state).toBe('CA')
  })

  it('2. PATCH updates company name and state', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNER_CTX)
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'comp-1' }]),
      }),
    })
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: 'comp-1', name: 'Updated Co', state: 'TX', plan: 'pilot' },
          ]),
        }),
      }),
    })

    const req = new Request('http://localhost/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Co', state: 'TX' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Updated Co')
    expect(body.state).toBe('TX')
  })
})
