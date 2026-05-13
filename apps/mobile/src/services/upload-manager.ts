import { Platform } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import RNFS from 'react-native-fs'
import {
  getPendingSessions,
  markChunkUploaded,
  markChunkFailed,
  markConsentSynced,
  setSessionStatus,
  getSession,
  type QueuedSession,
  type PendingChunk,
} from '../stores/upload-queue'

// ---------------------------------------------------------------------------
// Upload manager — processes MMKV chunk queue
// Called on: app open, connectivity change, recording stop
// ---------------------------------------------------------------------------

interface UploadManagerParams {
  apiBaseUrl: string
  authToken: string
}

export async function runUploadManager({
  apiBaseUrl,
  authToken,
}: UploadManagerParams): Promise<void> {
  const netState = await NetInfo.fetch()
  if (!netState.isConnected) return

  const sessions = getPendingSessions()
  if (sessions.length === 0) return

  for (const session of sessions) {
    await processSession(session, apiBaseUrl, authToken)
  }
}

async function processSession(
  session: QueuedSession,
  apiBaseUrl: string,
  authToken: string
): Promise<void> {
  setSessionStatus(session.sessionId, 'uploading')

  // Sync consent event if not yet synced
  if (!session.consentSyncedAt) {
    try {
      const consentRes = await fetch(`${apiBaseUrl}/api/calls/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          callId: session.callId,
          consentedAt: session.consentLoggedAt,
          devicePlatform: Platform.OS,
        }),
      })

      if (consentRes.ok) {
        markConsentSynced(session.sessionId)
      }
    } catch {
      // Non-blocking — continue with upload
    }
  }

  // Upload chunks in order
  const pendingChunks = session.chunks
    .filter((c) => c.status === 'pending' || c.status === 'uploading')
    .sort((a, b) => a.chunkIndex - b.chunkIndex)

  for (const chunk of pendingChunks) {
    await uploadChunk(session, chunk, apiBaseUrl, authToken)
  }

  // Check if all chunks are now uploaded
  const refreshed = getSession(session.sessionId)
  if (!refreshed) return

  const allUploaded = refreshed.chunks.every((c) => c.status === 'uploaded')
  if (!allUploaded) {
    const anyFailed = refreshed.chunks.some((c) => c.status === 'failed')
    if (anyFailed) {
      setSessionStatus(session.sessionId, 'failed')
    } else {
      setSessionStatus(session.sessionId, 'stopped')
    }
    return
  }

  // All uploaded — call upload-complete
  try {
    const s3Keys = refreshed.chunks.map((c) => c.s3Key).filter(Boolean) as string[]
    const totalDurationSec = refreshed.chunks.reduce((acc, c) => acc + c.durationSec, 0)

    const res = await fetch(`${apiBaseUrl}/api/calls/upload-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        callId: refreshed.callId,
        sessionId: refreshed.sessionId,
        s3Keys,
        totalDurationSec,
        chunkCount: refreshed.chunks.length,
        jobMetadata: refreshed.jobMetadata,
        devicePlatform: Platform.OS,
        audioFormat: 'aac-lc',
        audioBitrateKbps: 32,
      }),
    })

    if (res.ok) {
      // Delete local chunk files
      for (const chunk of refreshed.chunks) {
        try {
          await RNFS.unlink(chunk.filePath)
        } catch {
          // File may already be gone
        }
      }
      setSessionStatus(session.sessionId, 'complete')
    } else {
      setSessionStatus(session.sessionId, 'failed')
    }
  } catch {
    setSessionStatus(session.sessionId, 'failed')
  }
}

async function uploadChunk(
  session: QueuedSession,
  chunk: PendingChunk,
  apiBaseUrl: string,
  authToken: string
): Promise<void> {
  try {
    // Step 1: Get presigned URL
    const urlRes = await fetch(
      `${apiBaseUrl}/api/calls/upload-url?sessionId=${session.sessionId}&chunkIndex=${chunk.chunkIndex}&contentType=audio/aac`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    )
    if (!urlRes.ok) {
      markChunkFailed(session.sessionId, chunk.chunkId)
      return
    }
    const { presignedUrl, s3Key } = (await urlRes.json()) as {
      presignedUrl: string
      s3Key: string
      expiresIn: number
    }

    // Step 2: Read file and PUT to S3
    const fileContents = await RNFS.readFile(chunk.filePath, 'base64')
    const binaryStr = Buffer.from(fileContents, 'base64')

    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/aac' },
      body: binaryStr,
    })

    if (putRes.ok) {
      markChunkUploaded(session.sessionId, chunk.chunkId, s3Key)
    } else {
      markChunkFailed(session.sessionId, chunk.chunkId)
    }
  } catch {
    markChunkFailed(session.sessionId, chunk.chunkId)
  }
}
