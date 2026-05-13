import { Platform, PermissionsAndroid } from 'react-native'
import {
  AudioRecorder,
  FileFormat,
  FileDirectory,
  BitDepth,
  IOSAudioQuality,
  FlacCompressionLevel,
} from 'react-native-audio-api'
import { Audio } from 'expo-av'
import { Buffer } from 'buffer'
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

  // iOS: permission is requested when the AudioRecorder starts
}

// ---------------------------------------------------------------------------
// Consent tone — 440Hz sine wave for 1 second
// Uses expo-av instead of AudioContext to avoid poisoning the AVAudioSession
// category. AudioContext sets the session to Playback mode, which prevents
// the AudioRecorder from accessing the microphone.
// ---------------------------------------------------------------------------

function generateToneWav(): string {
  const sampleRate = 22050
  const durationSec = 1
  const frequency = 440
  const numSamples = sampleRate * durationSec
  const amplitude = 0.3 * 32767

  // Generate 16-bit PCM samples
  const samples = new Int16Array(numSamples)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    // Fade out in last 200ms
    const fadeStart = durationSec - 0.2
    const fade = t > fadeStart ? 1 - (t - fadeStart) / 0.2 : 1
    samples[i] = Math.round(amplitude * fade * Math.sin(2 * Math.PI * frequency * t))
  }

  // Build WAV header (44 bytes)
  const dataSize = numSamples * 2
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)             // chunk size
  header.writeUInt16LE(1, 20)              // PCM format
  header.writeUInt16LE(1, 22)              // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28) // byte rate
  header.writeUInt16LE(2, 32)              // block align
  header.writeUInt16LE(16, 34)             // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  const sampleBuffer = Buffer.from(samples.buffer)
  return Buffer.concat([header, sampleBuffer]).toString('base64')
}

// Cache the WAV so we only generate it once
let cachedToneBase64: string | null = null

export async function playConsentTone(): Promise<void> {
  if (!cachedToneBase64) {
    cachedToneBase64 = generateToneWav()
  }

  // Write WAV to temp file
  const tmpPath = `${RNFS.CachesDirectoryPath}/kova_consent_tone.wav`
  await RNFS.writeFile(tmpPath, cachedToneBase64, 'base64')

  // Configure session for recording BEFORE playing the tone — this ensures
  // the session stays in PlayAndRecord mode throughout.
  if (Platform.OS === 'ios') {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    })
  }

  const { sound } = await Audio.Sound.createAsync(
    { uri: `file://${tmpPath}` },
    { shouldPlay: true, volume: 0.3 }
  )

  // Wait for playback to finish
  await new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        resolve()
      }
    })
  })

  await sound.unloadAsync()
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

  const sessionId = currentSessionId
  const result = recorder.stop()
  recorder = null
  currentSessionId = null
  await stopRecordingForegroundService()

  if (Platform.OS === 'ios') {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    })
  }

  if (result.status === 'error') {
    console.error('[Recording] Failed to stop recorder:', result.message)
    return { durationSec: 0 }
  }

  if (result.paths.length > 0) {
    const durationPerChunk = result.duration / result.paths.length
    // size is in MB (per FileInfo JSDoc), convert to bytes
    const sizePerChunk = Math.round((result.size * 1024 * 1024) / result.paths.length)

    for (const filePath of result.paths) {
      addChunk(sessionId, {
        chunkId: uuidv4(),
        chunkIndex: chunkIndex++,
        filePath,
        sizeBytes: sizePerChunk,
        durationSec: durationPerChunk,
      })
    }
  }

  return { durationSec: result.duration }
}

export async function pauseRecorder(): Promise<void> {
  if (!recorder) return
  recorder.pause()
}

export async function resumeRecorder(): Promise<void> {
  if (!recorder) return
  recorder.resume()
}
