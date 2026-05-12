import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'

vi.mock('react-native-mmkv', () => {
  const store: Record<string, string> = {}
  return {
    MMKV: vi.fn().mockImplementation(() => ({
      getString: (key: string) => store[key] ?? undefined,
      set: (key: string, value: string) => { store[key] = value },
      delete: (key: string) => { delete store[key] },
      getAllKeys: () => Object.keys(store),
      clearAll: () => { for (const k of Object.keys(store)) delete store[k] },
    })),
  }
})
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn().mockResolvedValue({ isConnected: true }),
    addEventListener: vi.fn().mockReturnValue(() => {}),
  },
}))
vi.mock('react-native-fs', () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('binary'),
  },
}))
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

import { MMKV } from 'react-native-mmkv'
import NetInfo from '@react-native-community/netinfo'
import {
  createSession,
  addChunk,
  getSession,
  setSessionStopped,
  markConsentSynced,
} from '../../stores/upload-queue'
import { runUploadManager } from '../upload-manager'

const mmkvInstance = new MMKV()

const API_BASE = 'http://localhost:3000'
const AUTH_TOKEN = 'test-token'

beforeEach(() => {
  mmkvInstance.clearAll()
  vi.clearAllMocks()
  ;(NetInfo.fetch as MockedFunction<typeof NetInfo.fetch>).mockResolvedValue({
    isConnected: true,
  } as any)
})

describe('runUploadManager — offline', () => {
  it('does nothing when offline', async () => {
    ;(NetInfo.fetch as MockedFunction<typeof NetInfo.fetch>).mockResolvedValue({
      isConnected: false,
    } as any)
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('runUploadManager — successful upload', () => {
  it('uploads all chunks and calls upload-complete', async () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    setSessionStopped('sess-1')
    markConsentSynced('sess-1') // skip consent fetch in this test

    // Mock: GET upload-url → presigned URL
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          presignedUrl: 'https://s3.amazonaws.com/kova-audio-dev/audio/co-1/sess-1/chunk_0.aac?sig=abc',
          s3Key: 'audio/co-1/sess-1/chunk_0.aac',
          expiresIn: 900,
        }),
      })
      // Mock: PUT to S3 (presigned URL)
      .mockResolvedValueOnce({ ok: true })
      // Mock: POST upload-complete
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ callId: 'call-1', status: 'pending' }),
      })

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    const session = getSession('sess-1')
    expect(session?.overallStatus).toBe('complete')
    expect(session?.chunks[0]?.status).toBe('uploaded')
    expect(session?.chunks[0]?.s3Key).toBe('audio/co-1/sess-1/chunk_0.aac')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})

describe('runUploadManager — retry on failure', () => {
  it('increments attempts on upload failure', async () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    setSessionStopped('sess-1')
    markConsentSynced('sess-1') // skip consent fetch in this test

    // Mock: GET upload-url succeeds, PUT to S3 fails
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          presignedUrl: 'https://s3.amazonaws.com/bucket/key?sig=abc',
          s3Key: 'audio/co-1/sess-1/chunk_0.aac',
          expiresIn: 900,
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    const session = getSession('sess-1')
    expect(session?.chunks[0]?.uploadAttempts).toBe(1)
    expect(session?.chunks[0]?.status).toBe('pending')
  })
})
