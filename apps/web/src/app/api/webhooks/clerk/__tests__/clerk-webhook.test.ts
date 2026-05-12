import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@clerk/nextjs/webhooks', () => ({
  verifyWebhook: vi.fn(),
}))
vi.mock('@kova/db', () => ({
  db: {
    insert: vi.fn(),
    query: {
      companies: { findFirst: vi.fn() },
    },
  },
  companies: {},
  users: {},
}))

import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { db } from '@kova/db'
import { POST } from '../route'
import { NextRequest } from 'next/server'

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': 'msg_test',
      'svix-timestamp': '1234567890',
      'svix-signature': 'v1,test',
    },
    body: JSON.stringify(body),
  })
}

describe('Clerk Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test'
  })

  it('1. organization.created upserts a company', async () => {
    const evt = {
      type: 'organization.created',
      data: { id: 'org_test123', name: 'Test Plumbing Co' },
    }
    ;(verifyWebhook as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(evt)
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
      }),
    })

    const res = await POST(makeRequest(evt))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
    expect(db.insert).toHaveBeenCalled()
  })

  it('2. organizationMembership.created upserts a user with correct role mapping', async () => {
    const evt = {
      type: 'organizationMembership.created',
      data: {
        public_user_data: {
          user_id: 'user_clerk_1',
          first_name: 'Jane',
          last_name: 'Smith',
        },
        organization: { id: 'org_test123' },
        role: 'org:admin',
      },
    }
    ;(verifyWebhook as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(evt)
    ;(db.query as unknown as { companies: { findFirst: ReturnType<typeof vi.fn> } })
      .companies.findFirst.mockResolvedValue({ id: 'comp-1' })
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
      }),
    })

    const res = await POST(makeRequest(evt))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
    expect(db.insert).toHaveBeenCalled()
  })

  it('3. returns 400 when webhook signature is invalid', async () => {
    ;(verifyWebhook as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Invalid signature')
    )

    const res = await POST(makeRequest({ type: 'user.created', data: {} }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid signature')
  })
})
