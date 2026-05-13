import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HomeScreen from '../HomeScreen'

vi.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: async () => 'token-123' }),
}))

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: vi.fn() }),
}))

vi.mock('../../stores/upload-queue', () => ({
  getPendingSessions: () => [],
}))

const fetchCallsMock = vi.fn()

vi.mock('../../services/api', () => ({
  fetchCalls: (...args: unknown[]) => fetchCallsMock(...args),
}))

function renderHomeScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return TestRenderer.create(
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
    </QueryClientProvider>
  )
}

afterEach(() => {
  fetchCallsMock.mockReset()
  vi.clearAllMocks()
})

describe('HomeScreen', () => {
  it('keeps hook order stable when the calls query resolves', async () => {
    fetchCallsMock.mockResolvedValue({ data: [{ id: 'call-1', recordedAt: new Date().toISOString(), durationSec: 60, status: 'scored' }], nextPage: null, total: 1 })

    let renderer: ReactTestRenderer | undefined

    await expect(async () => {
      await act(async () => {
        renderer = renderHomeScreen()
      })

      await act(async () => {
        await Promise.resolve()
      })
    }).not.toThrow()

    expect(renderer).toBeDefined()
  })
})
