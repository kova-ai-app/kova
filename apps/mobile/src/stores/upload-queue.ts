import { MMKV } from 'react-native-mmkv'

// ---------------------------------------------------------------------------
// MMKV-backed upload queue
// Stores all recording sessions and their chunks across app restarts.
// ---------------------------------------------------------------------------

const mmkv = new MMKV({ id: 'kova-upload-queue' })
const QUEUE_KEY = 'sessions'

export interface QueuedSession {
  sessionId: string
  callId: string
  techId: string
  companyId: string
  consentLoggedAt: string
  consentSyncedAt: string | null
  recordingStartedAt: string
  recordingStoppedAt: string | null
  jobMetadata: {
    jobType: 'drain' | 'plumbing' | 'both'
    notes?: string
  } | null
  chunks: PendingChunk[]
  overallStatus: 'recording' | 'stopped' | 'uploading' | 'complete' | 'failed'
}

export interface PendingChunk {
  chunkId: string
  chunkIndex: number
  filePath: string
  sizeBytes: number
  durationSec: number
  createdAt: string
  uploadAttempts: number
  lastAttemptAt: string | null
  s3Key: string | null
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
}

const MAX_UPLOAD_ATTEMPTS = 5

function readAll(): Record<string, QueuedSession> {
  const raw = mmkv.getString(QUEUE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, QueuedSession>
  } catch {
    return {}
  }
}

function writeAll(sessions: Record<string, QueuedSession>): void {
  mmkv.set(QUEUE_KEY, JSON.stringify(sessions))
}

export function createSession(params: {
  sessionId: string
  callId: string
  techId: string
  companyId: string
  consentLoggedAt: string
}): QueuedSession {
  const sessions = readAll()
  const session: QueuedSession = {
    ...params,
    consentSyncedAt: null,
    recordingStartedAt: new Date().toISOString(),
    recordingStoppedAt: null,
    jobMetadata: null,
    chunks: [],
    overallStatus: 'recording',
  }
  sessions[params.sessionId] = session
  writeAll(sessions)
  return session
}

export function getSession(sessionId: string): QueuedSession | null {
  return readAll()[sessionId] ?? null
}

export function addChunk(
  sessionId: string,
  chunk: {
    chunkId: string
    chunkIndex: number
    filePath: string
    sizeBytes: number
    durationSec: number
  }
): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  const pendingChunk: PendingChunk = {
    ...chunk,
    createdAt: new Date().toISOString(),
    uploadAttempts: 0,
    lastAttemptAt: null,
    s3Key: null,
    status: 'pending',
  }
  session.chunks.push(pendingChunk)
  writeAll(sessions)
}

export function markChunkUploaded(
  sessionId: string,
  chunkId: string,
  s3Key: string
): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  const chunk = session.chunks.find((c) => c.chunkId === chunkId)
  if (!chunk) return
  chunk.status = 'uploaded'
  chunk.s3Key = s3Key
  writeAll(sessions)
}

export function markChunkFailed(sessionId: string, chunkId: string): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  const chunk = session.chunks.find((c) => c.chunkId === chunkId)
  if (!chunk) return
  chunk.uploadAttempts += 1
  chunk.lastAttemptAt = new Date().toISOString()
  if (chunk.uploadAttempts >= MAX_UPLOAD_ATTEMPTS) {
    chunk.status = 'failed'
  }
  writeAll(sessions)
}

export function setSessionStatus(
  sessionId: string,
  status: QueuedSession['overallStatus']
): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  session.overallStatus = status
  writeAll(sessions)
}

export function setSessionStopped(sessionId: string): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  session.recordingStoppedAt = new Date().toISOString()
  session.overallStatus = 'stopped'
  writeAll(sessions)
}

export function setJobMetadata(
  sessionId: string,
  metadata: QueuedSession['jobMetadata']
): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  session.jobMetadata = metadata
  writeAll(sessions)
}

export function markConsentSynced(sessionId: string): void {
  const sessions = readAll()
  const session = sessions[sessionId]
  if (!session) return
  session.consentSyncedAt = new Date().toISOString()
  writeAll(sessions)
}

export function getIncompleteSession(): QueuedSession | null {
  const sessions = readAll()
  return (
    Object.values(sessions).find(
      (s) => s.overallStatus === 'recording' && !s.recordingStoppedAt
    ) ?? null
  )
}

export function getPendingSessions(): QueuedSession[] {
  return Object.values(readAll()).filter(
    (s) => s.overallStatus === 'stopped' || s.overallStatus === 'uploading' || s.overallStatus === 'failed'
  )
}

export function deleteSession(sessionId: string): void {
  const sessions = readAll()
  delete sessions[sessionId]
  writeAll(sessions)
}
