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
  deleteSession,
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
    set({ status: 'recording', sessionId, callId, elapsedSec: 0, chunkCount: 0 })
    try {
      await playConsentTone()
      createSession({
        sessionId,
        callId,
        techId,
        companyId,
        consentLoggedAt: new Date().toISOString(),
      })
      await startRecorder(sessionId)
    } catch (err: any) {
      // Clean up orphaned session since recorder never started
      try { deleteSession(sessionId) } catch {}
      set({ status: 'idle', sessionId: null, callId: null, error: err?.message ?? 'Recording failed to start' })
    }
  },

  consentDeclined: async () => {
    set({ status: 'idle', sessionId: null, callId: null, techId: null, companyId: null })
  },

  pauseRecording: async () => {
    try {
      await pauseRecorder()
      set({ status: 'paused' })
    } catch (err: any) {
      // status left unchanged — recorder state is indeterminate after failure
      set({ error: err?.message ?? 'Pause failed' })
    }
  },

  resumeRecording: async () => {
    try {
      await resumeRecorder()
      set({ status: 'recording' })
    } catch (err: any) {
      // status left unchanged — recorder state is indeterminate after failure
      set({ error: err?.message ?? 'Resume failed' })
    }
  },

  stopRecording: async () => {
    const { sessionId } = get()
    if (!sessionId) return
    try {
      await stopRecorder()
      setSessionStopped(sessionId)
      set({ status: 'stopped' })
    } catch (err: any) {
      // Best-effort: transition to stopped state even if recorder failed
      try { setSessionStopped(sessionId) } catch {}
      set({ status: 'stopped', error: err?.message ?? 'Stop failed' })
    }
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
