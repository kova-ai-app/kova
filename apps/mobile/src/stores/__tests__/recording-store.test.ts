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
  it('throws if startRecording called while already recording', async () => {
    await useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    await useRecordingStore.getState().consentGranted()
    await expect(
      useRecordingStore.getState().startRecording({ techId: 'tech-1', companyId: 'co-1' })
    ).rejects.toThrow('Recording already active')
  })
})
