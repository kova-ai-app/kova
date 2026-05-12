import { describe, it, expect, vi } from 'vitest'

// vi.mock is hoisted above imports and prevents react-native-mmkv's real
// code (which loads react-native's Flow-typed files) from being executed.
vi.mock('react-native-mmkv', () => {
  // Shared in-memory store for the module-level MMKV instance
  const store: Record<string, string> = {}
  return {
    MMKV: vi.fn().mockImplementation(() => ({
      getString: (key: string) => store[key],
      set: (key: string, value: string) => { store[key] = value },
      delete: (key: string) => { delete store[key] },
      getAllKeys: () => Object.keys(store),
      clearAll: () => { Object.keys(store).forEach(k => delete store[k]) },
    })),
  }
})

// All imports must come AFTER vi.mock (though vi.mock is hoisted automatically)
import {
  createSession,
  getSession,
  addChunk,
  markChunkUploaded,
  markChunkFailed,
  setSessionStatus,
  getIncompleteSession,
  deleteSession,
} from '../upload-queue'

// Use unique session IDs per test — the MMKV store is shared but IDs don't collide.

describe('createSession', () => {
  it('creates a session and retrieves it', () => {
    createSession({
      sessionId: 'sess-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    const session = getSession('sess-1')
    expect(session).not.toBeNull()
    expect(session?.callId).toBe('call-1')
    expect(session?.overallStatus).toBe('recording')
    expect(session?.chunks).toHaveLength(0)
  })
})

describe('addChunk', () => {
  it('adds a chunk to an existing session', () => {
    createSession({
      sessionId: 'sess-chunk-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-chunk-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    const session = getSession('sess-chunk-1')
    expect(session?.chunks).toHaveLength(1)
    expect(session?.chunks[0]?.status).toBe('pending')
    expect(session?.chunks[0]?.uploadAttempts).toBe(0)
    expect(session?.chunks[0]?.s3Key).toBeNull()
  })
})

describe('markChunkUploaded', () => {
  it('marks a chunk as uploaded and stores s3Key', () => {
    createSession({
      sessionId: 'sess-upl-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-upl-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    markChunkUploaded('sess-upl-1', 'chunk-1', 'audio/co-1/sess-upl-1/chunk_0.aac')
    const session = getSession('sess-upl-1')
    expect(session?.chunks[0]?.status).toBe('uploaded')
    expect(session?.chunks[0]?.s3Key).toBe('audio/co-1/sess-upl-1/chunk_0.aac')
  })
})

describe('markChunkFailed', () => {
  it('increments attempt count and marks failed after 5 attempts', () => {
    createSession({
      sessionId: 'sess-fail-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    addChunk('sess-fail-1', {
      chunkId: 'chunk-1',
      chunkIndex: 0,
      filePath: '/tmp/chunk_0.aac',
      sizeBytes: 1200000,
      durationSec: 300,
    })
    for (let i = 0; i < 4; i++) {
      markChunkFailed('sess-fail-1', 'chunk-1')
      const s = getSession('sess-fail-1')
      expect(s?.chunks[0]?.status).toBe('pending')
      expect(s?.chunks[0]?.uploadAttempts).toBe(i + 1)
    }
    markChunkFailed('sess-fail-1', 'chunk-1')
    const session = getSession('sess-fail-1')
    expect(session?.chunks[0]?.status).toBe('failed')
    expect(session?.chunks[0]?.uploadAttempts).toBe(5)
  })
})

describe('setSessionStatus', () => {
  it('updates session overallStatus', () => {
    createSession({
      sessionId: 'sess-stat-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    setSessionStatus('sess-stat-1', 'uploading')
    expect(getSession('sess-stat-1')?.overallStatus).toBe('uploading')
  })
})

describe('getIncompleteSession', () => {
  it('returns a recording session', () => {
    createSession({
      sessionId: 'sess-inc-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    const incomplete = getIncompleteSession()
    expect(incomplete).not.toBeNull()
    expect(incomplete?.overallStatus).toBe('recording')
  })

  it('does not return a completed session', () => {
    createSession({
      sessionId: 'sess-done-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    setSessionStatus('sess-done-1', 'complete')
    const incomplete = getIncompleteSession()
    expect(incomplete?.sessionId).not.toBe('sess-done-1')
  })
})

describe('deleteSession', () => {
  it('removes a session from the store', () => {
    createSession({
      sessionId: 'sess-del-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      consentLoggedAt: '2026-05-12T10:00:00.000Z',
    })
    deleteSession('sess-del-1')
    expect(getSession('sess-del-1')).toBeNull()
  })
})
