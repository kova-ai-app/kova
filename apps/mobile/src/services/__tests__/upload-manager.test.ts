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
  markChunkUploaded,
  setSessionStatus,
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

describe('runUploadManager — upload-complete failure', () => {
  it('sets session status to failed when upload-complete API returns error', async () => {
    createSession({
      sessionId: 'sess-2',
      callId: 'call-2',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-2', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    setSessionStopped('sess-2')
    markConsentSynced('sess-2')

    // Mock: upload-url and S3 PUT succeed, upload-complete fails (non-ok)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          presignedUrl: 'https://s3.amazonaws.com/bucket/key?sig=abc',
          s3Key: 'audio/co-1/sess-2/chunk_0.aac',
          expiresIn: 900,
        }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 500 })

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    const session = getSession('sess-2')
    expect(session?.overallStatus).toBe('failed')
  })
})

describe('Buffer polyfill', () => {
  it('Buffer.from is available for base64 decoding', () => {
    expect(typeof global.Buffer).toBe('function')
    const result = Buffer.from('AAAA', 'base64')
    expect(result).toBeInstanceOf(Uint8Array)
  })
})

describe('runUploadManager — multi-session drain', () => {
  it('processes 3 stopped sessions sequentially to completion', async () => {
    for (let i = 1; i <= 3; i++) {
      createSession({
        sessionId: `sess-multi-${i}`,
        callId: `call-multi-${i}`,
        techId: 'tech-1',
        companyId: 'co-1',
        consentLoggedAt: '2026-05-12T10:00:00.000Z',
      })
      addChunk(`sess-multi-${i}`, {
        chunkId: `chunk-multi-${i}`,
        chunkIndex: 0,
        filePath: `/tmp/multi_chunk_${i}.aac`,
        sizeBytes: 1200000,
        durationSec: 300,
      })
      setSessionStopped(`sess-multi-${i}`)
      markConsentSynced(`sess-multi-${i}`)
    }

    // Each session: presigned URL + S3 PUT + upload-complete = 3 fetch calls
    for (let i = 1; i <= 3; i++) {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            presignedUrl: `https://s3.amazonaws.com/bucket/key-${i}?sig=abc`,
            s3Key: `audio/co-1/sess-multi-${i}/chunk_0.aac`,
            expiresIn: 900,
          }),
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ callId: `call-multi-${i}`, status: 'pending' }),
        })
    }

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    for (let i = 1; i <= 3; i++) {
      expect(getSession(`sess-multi-${i}`)?.overallStatus).toBe('complete')
      expect(getSession(`sess-multi-${i}`)?.chunks.every((c) => c.status === 'uploaded')).toBe(true)
    }
    expect(mockFetch).toHaveBeenCalledTimes(9)
  })
})

describe('runUploadManager — partial upload resume', () => {
  it('skips already-uploaded chunks and uploads only pending ones', async () => {
    createSession({
      sessionId: 'sess-resume',
      callId: 'call-resume',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-resume', { chunkId: 'c-r-0', chunkIndex: 0, filePath: '/tmp/r_0.aac', sizeBytes: 1200000, durationSec: 300 })
    addChunk('sess-resume', { chunkId: 'c-r-1', chunkIndex: 1, filePath: '/tmp/r_1.aac', sizeBytes: 1200000, durationSec: 300 })
    addChunk('sess-resume', { chunkId: 'c-r-2', chunkIndex: 2, filePath: '/tmp/r_2.aac', sizeBytes: 1200000, durationSec: 300 })
    setSessionStopped('sess-resume')
    markConsentSynced('sess-resume')

    // Simulate crash recovery: chunk 0 was already uploaded before crash
    markChunkUploaded('sess-resume', 'c-r-0', 'audio/co-1/sess-resume/chunk_0.aac')

    // Only chunks 1 and 2 need upload: 2 presigned URLs + 2 S3 PUTs + 1 upload-complete = 5 calls
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: 'https://s3.aws/1', s3Key: 'audio/co-1/sess-resume/chunk_1.aac', expiresIn: 900 }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: 'https://s3.aws/2', s3Key: 'audio/co-1/sess-resume/chunk_2.aac', expiresIn: 900 }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ callId: 'call-resume', status: 'pending' }) })

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    const session = getSession('sess-resume')
    expect(session?.overallStatus).toBe('complete')
    expect(session?.chunks.every((c) => c.status === 'uploaded')).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(5)
  })
})

describe('runUploadManager — 20-chunk session', () => {
  it('processes all 20 chunks to completion', async () => {
    createSession({
      sessionId: 'sess-20',
      callId: 'call-20',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    for (let i = 0; i < 20; i++) {
      addChunk('sess-20', {
        chunkId: `c-20-${i}`,
        chunkIndex: i,
        filePath: `/tmp/chunk20_${i}.aac`,
        sizeBytes: 1200000,
        durationSec: 300,
      })
    }
    setSessionStopped('sess-20')
    markConsentSynced('sess-20')

    // 20 chunks x (presigned URL + S3 PUT) + 1 upload-complete = 41 calls
    for (let i = 0; i < 20; i++) {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            presignedUrl: `https://s3.aws/${i}`,
            s3Key: `audio/co-1/sess-20/chunk_${i}.aac`,
            expiresIn: 900,
          }),
        })
        .mockResolvedValueOnce({ ok: true })
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ callId: 'call-20', status: 'pending' }),
    })

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    const session = getSession('sess-20')
    expect(session?.overallStatus).toBe('complete')
    expect(session?.chunks).toHaveLength(20)
    expect(session?.chunks.every((c) => c.status === 'uploaded')).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(41)
  })
})

describe('runUploadManager — partial chunk failure', () => {
  it('continues uploading other chunks when one chunk fails', async () => {
    createSession({
      sessionId: 'sess-partial',
      callId: 'call-partial',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-partial', { chunkId: 'c-p-0', chunkIndex: 0, filePath: '/tmp/p_0.aac', sizeBytes: 1200000, durationSec: 300 })
    addChunk('sess-partial', { chunkId: 'c-p-1', chunkIndex: 1, filePath: '/tmp/p_1.aac', sizeBytes: 1200000, durationSec: 300 })
    addChunk('sess-partial', { chunkId: 'c-p-2', chunkIndex: 2, filePath: '/tmp/p_2.aac', sizeBytes: 1200000, durationSec: 300 })
    setSessionStopped('sess-partial')
    markConsentSynced('sess-partial')

    // Chunk 0: presigned URL returns 500 -> markChunkFailed (attempt 1 < 5, stays 'pending')
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    // Chunk 1: presigned URL + S3 PUT succeed
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: 'https://s3.aws/1', s3Key: 'audio/co-1/sess-partial/chunk_1.aac', expiresIn: 900 }) })
      .mockResolvedValueOnce({ ok: true })
    // Chunk 2: presigned URL + S3 PUT succeed
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: 'https://s3.aws/2', s3Key: 'audio/co-1/sess-partial/chunk_2.aac', expiresIn: 900 }) })
      .mockResolvedValueOnce({ ok: true })

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    const session = getSession('sess-partial')
    // Not all uploaded -> no upload-complete call
    // Chunk 0: attempt=1 < 5 -> status stays 'pending' (not 'failed')
    // allUploaded=false, anyFailed=false -> session stays 'uploading'
    // 'uploading' is the expected terminal state here:
    // allUploaded=false (chunk 0 failed), anyFailed=false (attempt=1 < 5 threshold),
    // so processSession returns without calling setSessionStatus again
    expect(session?.overallStatus).toBe('uploading')
    expect(session?.chunks[0]?.status).toBe('pending')
    expect(session?.chunks[0]?.uploadAttempts).toBe(1)
    expect(session?.chunks[1]?.status).toBe('uploaded')
    expect(session?.chunks[2]?.status).toBe('uploaded')
    expect(mockFetch).toHaveBeenCalledTimes(5)
  })
})

describe('runUploadManager — crash recovery', () => {
  it('resumes an uploading session after crash with mixed chunk states', async () => {
    createSession({
      sessionId: 'sess-crash',
      callId: 'call-crash',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-crash', { chunkId: 'c-cr-0', chunkIndex: 0, filePath: '/tmp/cr_0.aac', sizeBytes: 1200000, durationSec: 300 })
    addChunk('sess-crash', { chunkId: 'c-cr-1', chunkIndex: 1, filePath: '/tmp/cr_1.aac', sizeBytes: 1200000, durationSec: 300 })
    addChunk('sess-crash', { chunkId: 'c-cr-2', chunkIndex: 2, filePath: '/tmp/cr_2.aac', sizeBytes: 1200000, durationSec: 300 })

    // Simulate pre-crash state: recording stopped, upload started, chunk 0 uploaded, then crash
    setSessionStopped('sess-crash')       // recordingStoppedAt set, status='stopped'
    markConsentSynced('sess-crash')
    markChunkUploaded('sess-crash', 'c-cr-0', 'audio/co-1/sess-crash/chunk_0.aac')
    setSessionStatus('sess-crash', 'uploading')  // simulate upload-in-progress at time of crash

    // Only chunks 1 and 2 need upload (chunk 0 is already 'uploaded', filtered out)
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: 'https://s3.aws/1', s3Key: 'audio/co-1/sess-crash/chunk_1.aac', expiresIn: 900 }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presignedUrl: 'https://s3.aws/2', s3Key: 'audio/co-1/sess-crash/chunk_2.aac', expiresIn: 900 }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ callId: 'call-crash', status: 'pending' }) })

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    const session = getSession('sess-crash')
    expect(session?.overallStatus).toBe('complete')
    expect(session?.chunks.every((c) => c.status === 'uploaded')).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(5)
  })
})

describe('runUploadManager — consent sync', () => {
  it('syncs consent to the API before uploading chunks', async () => {
    createSession({
      sessionId: 'sess-consent',
      callId: 'call-consent',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-consent', {
      chunkId: 'c-con-0',
      chunkIndex: 0,
      filePath: '/tmp/con_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    setSessionStopped('sess-consent')
    // NOTE: NOT calling markConsentSynced — consent should be synced via API

    // Mock: consent POST + presigned URL + S3 PUT + upload-complete = 4 calls
    mockFetch
      .mockResolvedValueOnce({ ok: true }) // consent sync (fire-and-forget, no json read)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          presignedUrl: 'https://s3.aws/con',
          s3Key: 'audio/co-1/sess-consent/chunk_0.aac',
          expiresIn: 900,
        }),
      })
      .mockResolvedValueOnce({ ok: true }) // S3 PUT
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ callId: 'call-consent', status: 'pending' }),
      })

    await runUploadManager({ apiBaseUrl: API_BASE, authToken: AUTH_TOKEN })

    const session = getSession('sess-consent')
    expect(session?.consentSyncedAt).not.toBeNull()
    expect(session?.overallStatus).toBe('complete')
    expect(mockFetch).toHaveBeenCalledTimes(4)
    // First call should be the consent sync
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/calls/consent',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
