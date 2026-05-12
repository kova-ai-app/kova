import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  requestRecordingPermissions,
  startRecorder,
  stopRecorder,
  pauseRecorder,
  resumeRecorder,
  playConsentTone,
} from '../services/recording'
import {
  createSession,
  setSessionStopped,
} from './upload-queue'

// ---------------------------------------------------------------------------
// Recording state machine
// ---------------------------------------------------------------------------

export type RecordingStatus =
  | 'idle'
  | 'consent_shown'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'uploading'
  | 'complete'
  | 'upload_failed'

interface RecordingState {
  status: RecordingStatus
  sessionId: string | null
  callId: string | null
  techId: string | null
  companyId: string | null
  batteryLevel: number | null
  elapsedSec: number
  chunkCount: number
  error: string | null
  // Actions
  startRecording: (params: { techId: string; companyId: string }) => Promise<void>
  consentGranted: () => Promise<void>
  consentDeclined: () => Promise<void>
  pauseRecording: () => Promise<void>
  resumeRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  onChunkRotated: (chunkPath: string, durationSec: number) => void
  setStatus: (status: RecordingStatus) => void
  setBatteryLevel: (level: number) => void
  incrementElapsed: () => void
  reset: () => void
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  status: 'idle',
  sessionId: null,
  callId: null,
  techId: null,
  companyId: null,
  batteryLevel: null,
  elapsedSec: 0,
  chunkCount: 0,
  error: null,

  startRecording: async ({ techId, companyId }) => {
    const { status } = get()
    if (status !== 'idle') {
      throw new Error('Recording already active')
    }
    await requestRecordingPermissions()
    set({ status: 'consent_shown', techId, companyId })
  },

  consentGranted: async () => {
    const { techId, companyId } = get()
    if (!techId || !companyId) return
    const sessionId = uuidv4()
    const callId = uuidv4()
    createSession({
      sessionId,
      callId,
      techId,
      companyId,
      consentLoggedAt: new Date().toISOString(),
    })
    set({ status: 'recording', sessionId, callId, elapsedSec: 0, chunkCount: 0 })
    await playConsentTone()
    await startRecorder(sessionId)
  },

  consentDeclined: async () => {
    set({ status: 'idle', sessionId: null, callId: null, techId: null, companyId: null })
  },

  pauseRecording: async () => {
    await pauseRecorder()
    set({ status: 'paused' })
  },

  resumeRecording: async () => {
    await resumeRecorder()
    set({ status: 'recording' })
  },

  stopRecording: async () => {
    const { sessionId } = get()
    if (!sessionId) return
    await stopRecorder()
    setSessionStopped(sessionId)
    set({ status: 'stopped' })
  },

  onChunkRotated: (_chunkPath: string, _durationSec: number) => {
    set((state) => ({ chunkCount: state.chunkCount + 1 }))
    // chunk registration handled in recording.ts via addChunk
  },

  setStatus: (status) => set({ status }),
  setBatteryLevel: (level) => set({ batteryLevel: level }),
  incrementElapsed: () => set((state) => ({ elapsedSec: state.elapsedSec + 1 })),

  reset: () =>
    set({
      status: 'idle',
      sessionId: null,
      callId: null,
      techId: null,
      companyId: null,
      batteryLevel: null,
      elapsedSec: 0,
      chunkCount: 0,
      error: null,
    }),
}))
