import { Platform, PermissionsAndroid } from 'react-native'
import {
  AudioContext,
  AudioRecorder,
  FileFormat,
  FileDirectory,
  BitDepth,
  IOSAudioQuality,
  FlacCompressionLevel,
} from 'react-native-audio-api'
import RNFS from 'react-native-fs'
import { startRecordingForegroundService, stopRecordingForegroundService } from './foreground-service'
import { v4 as uuidv4 } from 'uuid'
import { addChunk } from '../stores/upload-queue'

// ---------------------------------------------------------------------------
// Recording service — wraps react-native-audio-api AudioRecorder
// ---------------------------------------------------------------------------

const MIN_FREE_BYTES = 200 * 1024 * 1024  // 200 MB
// ~5 min of 32kbps mono AAC ≈ 1.2 MB
const ROTATION_BYTES = 1_200_000

let recorder: AudioRecorder | null = null
let currentSessionId: string | null = null
let chunkIndex = 0

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function requestRecordingPermissions(): Promise<void> {
  // Disk space check
  const fsInfo = await RNFS.getFSInfo()
  if (fsInfo.freeSpace < MIN_FREE_BYTES) {
    throw new Error('INSUFFICIENT_DISK_SPACE')
  }

  if (Platform.OS === 'android') {
    // API 34+ requires FOREGROUND_SERVICE_MICROPHONE at runtime
    if (Platform.Version >= 34) {
      const fsmStatus = await PermissionsAndroid.request(
        // API 34+ permission not yet in @types/react-native; cast required
        'android.permission.FOREGROUND_SERVICE_MICROPHONE' as Parameters<typeof PermissionsAndroid.request>[0]
      )
      if (fsmStatus !== 'granted') {
        throw new Error('FOREGROUND_SERVICE_MICROPHONE_DENIED')
      }
    }
    const audioStatus = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    )
    if (audioStatus !== 'granted') {
      throw new Error('RECORD_AUDIO_DENIED')
    }
  }

  // iOS: react-native-audio-api handles AVAudioSession permission internally
  // when AudioContext is created with input enabled
}

// ---------------------------------------------------------------------------
// Consent tone — 440Hz sine wave for 1 second
// ---------------------------------------------------------------------------

export async function playConsentTone(): Promise<void> {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = 440

  gain.gain.setValueAtTime(0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 1)

  await new Promise<void>((resolve) => setTimeout(resolve, 1100))
  await ctx.close()
}

// ---------------------------------------------------------------------------
// Recorder lifecycle
// ---------------------------------------------------------------------------

export async function startRecorder(sessionId: string): Promise<void> {
  if (recorder !== null) {
    throw new Error('Recorder already active')
  }
  currentSessionId = sessionId
  chunkIndex = 0

  recorder = new AudioRecorder()

  const fileResult = recorder.enableFileOutput({
    format: FileFormat.M4A,
    preset: {
      bitRate: 32000,
      sampleRate: 44100,
      bitDepth: BitDepth.Bit16,
      iosQuality: IOSAudioQuality.Low,
      flacCompressionLevel: FlacCompressionLevel.L0,
    },
    channelCount: 1,
    directory: FileDirectory.Document,
    subDirectory: 'Kova',
    fileNamePrefix: `call_${sessionId}_chunk_`,
    rotateIntervalBytes: ROTATION_BYTES,
  })

  if (fileResult.status === 'error') {
    recorder = null
    throw new Error(fileResult.message)
  }

  const startResult = recorder.start()
  if (startResult.status === 'error') {
    recorder = null
    throw new Error(startResult.message)
  }

  await startRecordingForegroundService()
}

export async function stopRecorder(): Promise<{ durationSec: number }> {
  if (!recorder || !currentSessionId) return { durationSec: 0 }

  const result = recorder.stop()
  await stopRecordingForegroundService()

  if (result.status === 'success' && result.paths.length > 0) {
    const durationPerChunk = result.duration / result.paths.length
    // size is in MB, convert to bytes
    const sizePerChunk = Math.round((result.size * 1024 * 1024) / result.paths.length)

    for (const filePath of result.paths) {
      addChunk(currentSessionId!, {
        chunkId: uuidv4(),
        chunkIndex: chunkIndex++,
        filePath,
        sizeBytes: sizePerChunk,
        durationSec: durationPerChunk,
      })
    }
  }

  const totalDuration = result.status === 'success' ? result.duration : 0
  recorder = null
  currentSessionId = null
  return { durationSec: totalDuration }
}

export async function pauseRecorder(): Promise<void> {
  if (!recorder) return
  recorder.pause()
}

export async function resumeRecorder(): Promise<void> {
  if (!recorder) return
  recorder.resume()
}
