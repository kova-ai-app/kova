import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mock: Clerk webhook verification ---
vi.mock('@clerk/nextjs/webhooks', () => ({
  verifyWebhook: vi.fn(),
}))

// --- Mock: Auth helpers ---
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn().mockResolvedValue({
    clerkUserId: 'user-1',
    orgId: 'org-1',
    role: 'owner',
  }),
  getAuthWithCompany: vi.fn().mockResolvedValue({
    auth: { clerkUserId: 'user-1', orgId: 'org-1', role: 'technician', companyId: 'co-1' },
    error: null,
  }),
}))

// --- Mock: API handler (unwrap HOF) ---
vi.mock('@/lib/api-handler', () => ({
  withErrorHandler: (fn: any) => fn,
}))

// --- Mock: Clerk auth for consent route ---
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'user-1', orgId: 'org-1', orgRole: 'org:admin' }),
}))

// --- Mock: BullMQ for upload-complete ---
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  })),
}))

// --- Mock: drizzle-orm (pricebook route imports eq/desc from here) ---
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
  and: vi.fn(),
}))

// --- Track all DB operations ---
const ops: Array<{ op: string; data?: unknown }> = []

// --- Mock: @kova/db (shared across all route handlers) ---
vi.mock('@kova/db', () => ({
  db: {
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((data: unknown) => {
        ops.push({ op: 'insert', data })
        return {
          // Webhook + consent pattern: .values().onConflictDoUpdate().returning()
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'call-1',
              consentLoggedAt: new Date('2026-05-12T10:00:00Z'),
            }]),
          }),
          // Pricebook pattern: .values().returning()
          returning: vi.fn().mockResolvedValue([{
            id: 'item-1',
            name: 'Drain cleaning',
            trade: 'drain',
            opportunityType: 'repair',
          }]),
        }
      }),
    })),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((data: unknown) => {
        ops.push({ op: 'update', data })
        return {
          where: vi.fn().mockResolvedValue([]),
        }
      }),
    })),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          id: 'call-1',
          companyId: 'co-1',
          techId: 'tech-1',
          status: 'uploading',
          sessionId: 'sess-1',
        }]),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'call-1' }]),
        }),
      }),
    }),
    query: {
      companies: { findFirst: vi.fn().mockResolvedValue({ id: 'co-1', clerkOrgId: 'org-1' }) },
    },
  },
  calls: {},
  companies: {},
  users: {},
  pricebookItems: {},
  transcripts: {},
  processingCosts: {},
  scores: {},
  opportunities: {},
  coachingPoints: {},
  eq: vi.fn(),
  and: vi.fn(),
}))

import { verifyWebhook } from '@clerk/nextjs/webhooks'

describe('Full Onboarding Chain: webhook -> pricebook -> consent -> upload-complete', () => {
  beforeEach(() => {
    ops.length = 0
    vi.clearAllMocks() // clears call history only; vi.resetAllMocks() would clear implementations
    process.env.CLERK_WEBHOOK_SECRET = 'test-secret'
  })

  afterEach(() => {
    delete process.env.CLERK_WEBHOOK_SECRET
  })

  it('completes the full flow from org creation to scoring enqueue', async () => {
    const webhookHeaders = {
      'content-type': 'application/json',
      'svix-id': 'msg-1',
      'svix-timestamp': '1234567890',
      'svix-signature': 'v1,fake',
    }

    // --- Step 1: organization.created webhook ---
    ;(verifyWebhook as any).mockResolvedValueOnce({
      type: 'organization.created',
      data: { id: 'org-1', name: 'Drain Right LLC' },
    })

    const { POST: webhookPost } = await import('../webhooks/clerk/route')

    const orgRes = await webhookPost(
      new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: webhookHeaders,
        body: JSON.stringify({}),
      })
    )
    expect(orgRes.status).toBe(200)
    const orgBody = await orgRes.json()
    expect(orgBody).toMatchObject({ received: true })

    // --- Step 2: organizationMembership.created webhook ---
    ;(verifyWebhook as any).mockResolvedValueOnce({
      type: 'organizationMembership.created',
      data: {
        organization: { id: 'org-1' },
        public_user_data: { user_id: 'user-1', first_name: 'Jake', last_name: 'Smith' },
        role: 'org:admin',
      },
    })

    const memberRes = await webhookPost(
      new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: webhookHeaders,
        body: JSON.stringify({}),
      })
    )
    expect(memberRes.status).toBe(200)
    const memberBody = await memberRes.json()
    expect(memberBody).toMatchObject({ received: true })

    // --- Step 3: Pricebook POST ---
    const { POST: pricebookPost } = await import('../pricebook/route')

    const pricebookRes = await pricebookPost(
      new NextRequest('http://localhost/api/pricebook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Drain cleaning',
          trade: 'drain',
          opportunityType: 'repair',
          pricingModel: 'fixed',
          priceFixed: 350,
        }),
      })
    )
    expect(pricebookRes.status).toBe(201)
    const pricebookBody = await pricebookRes.json()
    expect(pricebookBody).toMatchObject({ id: 'item-1', name: 'Drain cleaning' })

    // --- Step 4: Consent POST ---
    const { POST: consentPost } = await import('../calls/consent/route')

    const consentRes = await consentPost(
      new NextRequest('http://localhost/api/calls/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'sess-1',
          callId: 'call-1',
          consentedAt: '2026-05-12T10:00:00Z',
          devicePlatform: 'ios',
        }),
      })
    )
    expect(consentRes.status).toBe(200)

    // --- Step 5: Upload Complete POST ---
    const { POST: uploadPost } = await import('../calls/upload-complete/route')

    const uploadRes = await uploadPost(
      new NextRequest('http://localhost/api/calls/upload-complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          callId: 'call-1',
          sessionId: 'sess-1',
          s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
          totalDurationSec: 300,
          chunkCount: 1,
          jobMetadata: null,
          devicePlatform: 'ios',
          audioFormat: 'aac-lc',
          audioBitrateKbps: 32,
        }),
      })
    )
    expect(uploadRes.status).toBe(202)
    const uploadBody = await uploadRes.json()
    expect(uploadBody).toMatchObject({ callId: 'call-1' })

    // --- Verify full chain produced expected DB operations ---
    const insertCount = ops.filter((o) => o.op === 'insert').length
    const updateCount = ops.filter((o) => o.op === 'update').length
    // Inserts: org (webhook), user (webhook), pricebook item, consent call = exactly 4
    expect(insertCount).toBe(4)
    // Updates: upload-complete sets call status = at least 1
    expect(updateCount).toBeGreaterThanOrEqual(1)
  })
})
