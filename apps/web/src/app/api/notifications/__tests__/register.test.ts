import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn() },
  users: {},
  pushTokens: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn(),
}))

import { requireRole } from '@/lib/auth'
import { db } from '@kova/db'
import { POST } from '../register/route'
import { NextResponse } from 'next/server'

const AUTH_CTX = { clerkUserId: 'user-clerk-1', orgId: 'org-1', role: 'technician' as const }

function makeRequest(body: object) {
  return new Request('http://localhost/api/notifications/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/notifications/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(AUTH_CTX)

    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'user-db-1' }]),
      }),
    })
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    })
  })

  it('1. registers a push token and returns 201', async () => {
    const req = makeRequest({ token: 'ExponentPushToken[abc123]', platform: 'ios' })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.registered).toBe(true)
  })

  it('2. returns 400 when token is missing', async () => {
    const req = makeRequest({ platform: 'ios' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('3. returns 401 when not authenticated', async () => {
    ;(requireRole as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
    const req = makeRequest({ token: 'ExponentPushToken[abc123]', platform: 'ios' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
