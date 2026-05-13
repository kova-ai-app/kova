import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '17.0' },
  PermissionsAndroid: {
    request: vi.fn(),
    PERMISSIONS: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    },
  },
}))

vi.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: vi.fn().mockResolvedValue({
        sound: {
          setOnPlaybackStatusUpdate: vi.fn((callback: (status: { isLoaded: boolean; didJustFinish: boolean }) => void) => {
            callback({ isLoaded: true, didJustFinish: true })
          }),
          unloadAsync: vi.fn().mockResolvedValue(undefined),
        },
      }),
    },
  },
}))

const mockEnableFileOutput = vi.fn().mockReturnValue({ status: 'ok' })
const mockStart = vi.fn().mockReturnValue({ status: 'ok' })

vi.mock('react-native-audio-api', () => ({
  AudioRecorder: vi.fn().mockImplementation(() => ({
    enableFileOutput: mockEnableFileOutput,
    start: mockStart,
    stop: vi.fn().mockReturnValue({ status: 'ok', paths: [], duration: 0, size: 0 }),
    pause: vi.fn(),
    resume: vi.fn(),
  })),
  AudioManager: {
    setAudioSessionOptions: vi.fn(),
  },
  FileFormat: { M4A: 'm4a' },
  FileDirectory: { Document: 'document' },
  BitDepth: { Bit16: 16 },
  IOSAudioQuality: { Low: 'low' },
  FlacCompressionLevel: { L0: 'l0' },
}))

vi.mock('react-native-fs', () => ({
  default: {
    getFSInfo: vi.fn().mockResolvedValue({ freeSpace: 500 * 1024 * 1024 }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    CachesDirectoryPath: '/tmp',
  },
}))

vi.mock('../foreground-service', () => ({
  startRecordingForegroundService: vi.fn().mockResolvedValue(undefined),
  stopRecordingForegroundService: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../stores/upload-queue', () => ({
  addChunk: vi.fn(),
}))

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('chunk-id'),
}))

import { Audio } from 'expo-av'
import { AudioManager } from 'react-native-audio-api'
import { playConsentTone, startRecorder } from '../recording'

describe('recording service session setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnableFileOutput.mockReturnValue({ status: 'ok' })
    mockStart.mockReturnValue({ status: 'ok' })
  })

  it('keeps iOS playback tone in recording-capable mode', async () => {
    await playConsentTone()

    expect(Audio.setAudioModeAsync).toHaveBeenCalledWith({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    })
  })

  it('configures react-native-audio-api for play-and-record before recorder start', async () => {
    await startRecorder('session-123')

    expect(AudioManager.setAudioSessionOptions).toHaveBeenCalledWith({
      iosCategory: 'playAndRecord',
      iosMode: 'default',
      iosOptions: ['defaultToSpeaker', 'allowBluetoothHFP'],
      iosNotifyOthersOnDeactivation: true,
    })
    expect(mockEnableFileOutput).toHaveBeenCalledOnce()
    expect(mockStart).toHaveBeenCalledOnce()
  })
})
