import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getAuthWithCompany: vi.fn(),
}))

vi.mock('@/lib/api-handler', () => ({
  withErrorHandler: (fn: typeof import('../[id]/route').GET) => fn,
}))

vi.mock('@kova/db', () => ({
  db: { select: vi.fn() },
  calls: { id: 'calls.id', companyId: 'calls.companyId', scoreId: 'calls.scoreId', customerId: 'calls.customerId' },
  scores: { id: 'scores.id' },
  transcripts: { id: 'transcripts.id', callId: 'transcripts.callId' },
  opportunities: { scoreId: 'opportunities.scoreId' },
  feedback: { callId: 'feedback.callId' },
  customers: { id: 'customers.id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field: string, value: string) => `${field}=${value}`),
  and: vi.fn((...conditions: string[]) => conditions.join(' AND ')),
}))

import { getAuthWithCompany } from '@/lib/auth'
import { db } from '@kova/db'
import { GET } from '../[id]/route'

const AUTH_WITH_COMPANY = {
  auth: { clerkUserId: 'user-1', orgId: 'org-1', role: 'owner' as const, companyId: 'company-1' },
  error: null,
}

describe('GET /api/calls/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns transcript by callId when transcriptId is null', async () => {
    ;(getAuthWithCompany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      AUTH_WITH_COMPANY
    )

    const call = {
      id: 'call-1',
      companyId: 'company-1',
      scoreId: null,
      transcriptId: null,
      customerId: null,
    }

    const transcript = {
      id: 'transcript-1',
      callId: 'call-1',
      text: 'Recovered transcript',
    }

    const selectMock = db.select as unknown as ReturnType<typeof vi.fn>
    const callWhere = vi.fn().mockResolvedValue([call])
    const transcriptWhere = vi.fn().mockImplementation(async (condition: string) => {
      if (condition === 'transcripts.callId=call-1') {
        return [transcript]
      }

      return []
    })
    const feedbackWhere = vi.fn().mockResolvedValue([])

    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: callWhere,
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: transcriptWhere,
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: feedbackWhere,
        }),
      })

    const response = await GET(new Request('http://localhost/api/calls/call-1'), {
      params: Promise.resolve({ id: 'call-1' }),
    })

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(transcriptWhere).toHaveBeenCalledWith('transcripts.callId=call-1')
    expect(body.transcript).toEqual(transcript)
  })
})
