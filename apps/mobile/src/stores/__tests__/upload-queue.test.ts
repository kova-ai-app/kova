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
  getPendingSessions,
  setSessionStopped,
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

describe('stress: multi-session', () => {
  it('stores and retrieves 3 independent sessions', () => {
    for (let i = 1; i <= 3; i++) {
      createSession({
        sessionId: `sess-coexist-${i}`,
        callId: `call-coexist-${i}`,
        techId: 'tech-1',
        companyId: 'co-1',
        consentLoggedAt: '2026-05-12T10:00:00.000Z',
      })
    }
    for (let i = 1; i <= 3; i++) {
      const s = getSession(`sess-coexist-${i}`)
      expect(s).not.toBeNull()
      expect(s?.callId).toBe(`call-coexist-${i}`)
      expect(s?.overallStatus).toBe('recording')
    }
  })
})

describe('stress: getPendingSessions filtering', () => {
  it('returns only stopped/uploading/failed sessions', () => {
    createSession({ sessionId: 'sess-pf-rec', callId: 'c-pf-1', techId: 't-1', companyId: 'co-1', consentLoggedAt: '2026-05-12T10:00:00.000Z' })
    createSession({ sessionId: 'sess-pf-stop', callId: 'c-pf-2', techId: 't-1', companyId: 'co-1', consentLoggedAt: '2026-05-12T10:00:00.000Z' })
    createSession({ sessionId: 'sess-pf-upl', callId: 'c-pf-3', techId: 't-1', companyId: 'co-1', consentLoggedAt: '2026-05-12T10:00:00.000Z' })
    createSession({ sessionId: 'sess-pf-comp', callId: 'c-pf-4', techId: 't-1', companyId: 'co-1', consentLoggedAt: '2026-05-12T10:00:00.000Z' })
    createSession({ sessionId: 'sess-pf-fail', callId: 'c-pf-5', techId: 't-1', companyId: 'co-1', consentLoggedAt: '2026-05-12T10:00:00.000Z' })

    setSessionStopped('sess-pf-stop')
    setSessionStatus('sess-pf-upl', 'uploading')
    setSessionStatus('sess-pf-comp', 'complete')
    setSessionStatus('sess-pf-fail', 'failed')
    // sess-pf-rec stays 'recording'

    const pending = getPendingSessions()
    const ids = pending.map((s) => s.sessionId)
    expect(ids).toContain('sess-pf-stop')
    expect(ids).toContain('sess-pf-upl')
    expect(ids).toContain('sess-pf-fail')
    expect(ids).not.toContain('sess-pf-rec')
    expect(ids).not.toContain('sess-pf-comp')
  })
})

describe('stress: 20-chunk session', () => {
  it('stores and retrieves a session with 20 chunks', () => {
    createSession({ sessionId: 'sess-20c', callId: 'call-20c', techId: 'tech-1', companyId: 'co-1', consentLoggedAt: '2026-05-12T10:00:00.000Z' })
    for (let i = 0; i < 20; i++) {
      addChunk('sess-20c', {
        chunkId: `c-20c-${i}`,
        chunkIndex: i,
        filePath: `/tmp/c20_${i}.aac`,
        sizeBytes: 1200000,
        durationSec: 300,
      })
    }
    const session = getSession('sess-20c')
    expect(session?.chunks).toHaveLength(20)
    expect(session?.chunks[0]?.chunkIndex).toBe(0)
    expect(session?.chunks[19]?.chunkIndex).toBe(19)
    expect(session?.chunks.every((c) => c.status === 'pending')).toBe(true)
  })
})

describe('stress: mixed chunk states', () => {
  it('maintains correct state across uploaded, failed, and pending chunks', () => {
    createSession({ sessionId: 'sess-mix', callId: 'call-mix', techId: 'tech-1', companyId: 'co-1', consentLoggedAt: '2026-05-12T10:00:00.000Z' })
    addChunk('sess-mix', { chunkId: 'c-m-0', chunkIndex: 0, filePath: '/tmp/m_0.aac', sizeBytes: 1200000, durationSec: 300 })
    addChunk('sess-mix', { chunkId: 'c-m-1', chunkIndex: 1, filePath: '/tmp/m_1.aac', sizeBytes: 1200000, durationSec: 300 })
    addChunk('sess-mix', { chunkId: 'c-m-2', chunkIndex: 2, filePath: '/tmp/m_2.aac', sizeBytes: 1200000, durationSec: 300 })

    markChunkUploaded('sess-mix', 'c-m-0', 'audio/co-1/sess-mix/chunk_0.aac')
    for (let i = 0; i < 5; i++) markChunkFailed('sess-mix', 'c-m-1')
    // c-m-2 stays pending

    const session = getSession('sess-mix')
    expect(session?.chunks[0]?.status).toBe('uploaded')
    expect(session?.chunks[0]?.s3Key).toBe('audio/co-1/sess-mix/chunk_0.aac')
    expect(session?.chunks[1]?.status).toBe('failed')
    expect(session?.chunks[1]?.uploadAttempts).toBe(5)
    expect(session?.chunks[2]?.status).toBe('pending')
    expect(session?.chunks[2]?.uploadAttempts).toBe(0)
  })
})

describe('stress: session isolation', () => {
  it('deleting one session does not affect others', () => {
    createSession({ sessionId: 'sess-iso-1', callId: 'c-i-1', techId: 't-1', companyId: 'co-1', consentLoggedAt: '2026-05-12T10:00:00.000Z' })
    createSession({ sessionId: 'sess-iso-2', callId: 'c-i-2', techId: 't-1', companyId: 'co-1', consentLoggedAt: '2026-05-12T10:00:00.000Z' })
    createSession({ sessionId: 'sess-iso-3', callId: 'c-i-3', techId: 't-1', companyId: 'co-1', consentLoggedAt: '2026-05-12T10:00:00.000Z' })

    addChunk('sess-iso-2', { chunkId: 'c-iso', chunkIndex: 0, filePath: '/tmp/iso.aac', sizeBytes: 1200000, durationSec: 300 })

    deleteSession('sess-iso-2')

    expect(getSession('sess-iso-1')).not.toBeNull()
    expect(getSession('sess-iso-2')).toBeNull()
    expect(getSession('sess-iso-3')).not.toBeNull()
  })
})
