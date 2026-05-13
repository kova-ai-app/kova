import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock all native modules before importing anything
vi.mock('react-native-mmkv', () => {
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
vi.mock('react-native-fs', () => ({
  default: { getFSInfo: vi.fn().mockResolvedValue({ freeSpace: 500 * 1024 * 1024 }) },
}))
vi.mock('react-native-audio-api', () => ({
  AudioContext: vi.fn(),
}))
vi.mock('react-native-device-info', () => ({
  default: { getBatteryLevel: vi.fn().mockResolvedValue(0.8) },
}))
vi.mock('expo-notifications', () => ({
  setNotificationChannelAsync: vi.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: vi.fn().mockResolvedValue(undefined),
  dismissNotificationAsync: vi.fn().mockResolvedValue(undefined),
  AndroidImportance: { LOW: 2 },
}))
vi.mock('../../services/recording', () => ({
  requestRecordingPermissions: vi.fn().mockResolvedValue(undefined),
  startRecorder: vi.fn().mockResolvedValue(undefined),
  stopRecorder: vi.fn().mockResolvedValue({ durationSec: 300 }),
  pauseRecorder: vi.fn().mockResolvedValue(undefined),
  resumeRecorder: vi.fn().mockResolvedValue(undefined),
  playConsentTone: vi.fn().mockResolvedValue(undefined),
}))

import { useRecordingStore } from '../recording-store'

beforeEach(() => {
  useRecordingStore.setState({
    status: 'idle',
    sessionId: null,
    callId: null,
    techId: null,
    companyId: null,
    batteryLevel: null,
    elapsedSec: 0,
    chunkCount: 0,
    error: null,
  })
})

describe('initial state', () => {
  it('starts idle', () => {
    expect(useRecordingStore.getState().status).toBe('idle')
  })
})

describe('startRecording', () => {
  it('transitions from idle to consent_shown', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    expect(useRecordingStore.getState().status).toBe('consent_shown')
  })

  it('allows restarting from consent_shown as a fresh start path', async () => {
    useRecordingStore.setState({
      status: 'consent_shown',
      techId: 'tech-1',
      companyId: 'co-1',
    })

    await expect(
      useRecordingStore.getState().startRecording({ techId: 'tech-2', companyId: 'co-2' })
    ).resolves.toBeUndefined()

    expect(useRecordingStore.getState().status).toBe('consent_shown')
    expect(useRecordingStore.getState().techId).toBe('tech-2')
    expect(useRecordingStore.getState().companyId).toBe('co-2')
  })

  it('clears stale session metadata and progress when starting from a non-active state', async () => {
    useRecordingStore.setState({
      status: 'upload_failed',
      sessionId: 'session-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
      elapsedSec: 42,
      chunkCount: 7,
      error: 'Previous upload failed',
    })

    await useRecordingStore.getState().startRecording({ techId: 'tech-2', companyId: 'co-2' })

    expect(useRecordingStore.getState().status).toBe('consent_shown')
    expect(useRecordingStore.getState().sessionId).toBeNull()
    expect(useRecordingStore.getState().callId).toBeNull()
    expect(useRecordingStore.getState().error).toBeNull()
    expect(useRecordingStore.getState().elapsedSec).toBe(0)
    expect(useRecordingStore.getState().chunkCount).toBe(0)
    expect(useRecordingStore.getState().techId).toBe('tech-2')
    expect(useRecordingStore.getState().companyId).toBe('co-2')
  })
})

describe('consentGranted', () => {
  it('transitions from consent_shown to recording', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    await useRecordingStore.getState().consentGranted()
    expect(useRecordingStore.getState().status).toBe('recording')
    expect(useRecordingStore.getState().sessionId).not.toBeNull()
    expect(useRecordingStore.getState().callId).not.toBeNull()
  })
})

describe('consentDeclined', () => {
  it('transitions from consent_shown back to idle', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    await useRecordingStore.getState().consentDeclined()
    expect(useRecordingStore.getState().status).toBe('idle')
    expect(useRecordingStore.getState().sessionId).toBeNull()
  })
})

describe('stopRecording', () => {
  it('transitions from recording to stopped', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    await useRecordingStore.getState().consentGranted()
    await useRecordingStore.getState().stopRecording()
    expect(useRecordingStore.getState().status).toBe('stopped')
  })
})

describe('concurrent guard', () => {
  it('allows startRecording after stop when handoff has advanced to uploading', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    await useRecordingStore.getState().consentGranted()
    await useRecordingStore.getState().stopRecording()

    useRecordingStore.getState().setStatus('uploading')

    await expect(
      useRecordingStore.getState().startRecording({ techId: 'tech-2', companyId: 'co-2' })
    ).resolves.toBeUndefined()

    expect(useRecordingStore.getState().status).toBe('consent_shown')
    expect(useRecordingStore.getState().techId).toBe('tech-2')
    expect(useRecordingStore.getState().companyId).toBe('co-2')
  })

  it('throws if startRecording called while already recording', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    await useRecordingStore.getState().consentGranted()
    await expect(
      useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    ).rejects.toThrow('Recording already active')
  })

  it('throws if startRecording called while recording is actively in progress', async () => {
    useRecordingStore.setState({
      status: 'recording',
      sessionId: 'session-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
    })

    await expect(
      useRecordingStore.getState().startRecording({ techId: 'tech-2', companyId: 'co-2' })
    ).rejects.toThrow('Recording already active')
  })

  it('throws if startRecording called while recording is paused', async () => {
    useRecordingStore.setState({
      status: 'paused',
      sessionId: 'session-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
    })

    await expect(
      useRecordingStore.getState().startRecording({ techId: 'tech-2', companyId: 'co-2' })
    ).rejects.toThrow('Recording already active')
  })

  it('throws if startRecording called while handoff is still stopped', async () => {
    useRecordingStore.setState({
      status: 'stopped',
      sessionId: 'session-1',
      callId: 'call-1',
      techId: 'tech-1',
      companyId: 'co-1',
    })

    await expect(
      useRecordingStore.getState().startRecording({ techId: 'tech-2', companyId: 'co-2' })
    ).rejects.toThrow('Recording already active')
  })
})

describe('consentGranted error handling', () => {
  it('sets error and resets to idle when startRecorder throws', async () => {
    const recordingModule = await import('../../services/recording')
    ;(recordingModule.startRecorder as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Microphone busy'))

    // Directly set the state that consentGranted requires
    useRecordingStore.setState({
      status: 'consent_shown',
      techId: 'tech-1',
      companyId: 'co-1',
    })

    await useRecordingStore.getState().consentGranted()

    expect(useRecordingStore.getState().status).toBe('idle')
    expect(useRecordingStore.getState().error).toBe('Microphone busy')
    // Session is created before startRecorder, then deleted in the catch block
  })
})
