import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

import {
  fetchCalls,
  fetchCall,
  fetchCallAudioUrl,
  disputeOpportunity,
  registerPushToken,
} from '../api'

const TOKEN = 'clerk-token-abc'

function mockOkResponse(data: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => data,
  })
}

function mockErrorResponse(status: number) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ message: `HTTP ${status}` }),
  })
}

describe('API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000'
  })

  it('1. fetchCalls sends Authorization header and returns data', async () => {
    mockOkResponse({ data: [{ id: 'call-1' }], nextPage: null, total: 1 })

    const result = await fetchCalls(TOKEN, 0)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/calls?page=0',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    )
    expect(result.data[0].id).toBe('call-1')
  })

  it('2. fetchCall fetches a single call by id', async () => {
    mockOkResponse({ call: { id: 'call-1' }, score: null, opportunities: [] })

    const result = await fetchCall(TOKEN, 'call-1')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/calls/call-1',
      expect.anything()
    )
    expect(result.call.id).toBe('call-1')
  })

  it('3. fetchCallAudioUrl returns presigned URL', async () => {
    mockOkResponse({ url: 'https://s3.example.com/audio.aac?signed=1', expiresInSec: 3600 })

    const result = await fetchCallAudioUrl(TOKEN, 'call-1')

    expect(result.url).toContain('s3.example.com')
  })

  it('4. disputeOpportunity sends POST with reason', async () => {
    mockOkResponse({ disputed: true })

    await disputeOpportunity(TOKEN, 'opp-1', 'Customer never requested this')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/opportunities/opp-1/dispute',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Customer never requested this' }),
      })
    )
  })

  it('5. throws an error when response is not ok', async () => {
    mockErrorResponse(401)

    await expect(fetchCalls(TOKEN, 0)).rejects.toThrow()
  })

  it('6. aborts request after timeout (15s default)', async () => {
    // Simulate fetch that detects the abort signal and rejects with AbortError
    global.fetch = vi.fn().mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            const err = new DOMException('The operation was aborted.', 'AbortError')
            reject(err)
          })
          // Never resolves on its own
        })
    )

    vi.useFakeTimers()
    const promise = fetchCalls(TOKEN, 0)
    vi.advanceTimersByTime(16000)
    vi.useRealTimers()

    await expect(promise).rejects.toThrow('Request timed out')
  }, 20000)
})
