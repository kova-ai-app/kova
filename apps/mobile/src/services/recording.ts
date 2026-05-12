import { Platform } from 'react-native'
import { AudioContext } from 'react-native-audio-api'
import * as Notifications from 'expo-notifications'
import RNFS from 'react-native-fs'
import { addChunk } from '../stores/upload-queue'

// ---------------------------------------------------------------------------
// Recording service — wraps react-native-audio-api AudioRecorder
// ---------------------------------------------------------------------------

const CHUNK_DURATION_MS = 5 * 60 * 1000 // 5 minutes
const MIN_FREE_BYTES = 200 * 1024 * 1024  // 200 MB
const RECORDING_NOTIFICATION_ID = 'kova-recording-active'

let audioContext: InstanceType<typeof AudioContext> | null = null
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
    const { PermissionsAndroid } = require('react-native')
    // API 34+ requires FOREGROUND_SERVICE_MICROPHONE at runtime
    if (Platform.Version >= 34) {
      const fsmStatus = await PermissionsAndroid.request(
        'android.permission.FOREGROUND_SERVICE_MICROPHONE'
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
// Android foreground service notification
// ---------------------------------------------------------------------------

async function showRecordingNotification(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('kova-recording', {
    name: 'Recording Status',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
  })
  await Notifications.scheduleNotificationAsync({
    identifier: RECORDING_NOTIFICATION_ID,
    content: {
      title: 'Kova — Recording Active',
      body: 'Tap to return to the app.',
      sticky: true,
      priority: 'low',
    },
    trigger: null,
  })
}

async function dismissRecordingNotification(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.dismissNotificationAsync(RECORDING_NOTIFICATION_ID)
}

// ---------------------------------------------------------------------------
// Recorder lifecycle
// ---------------------------------------------------------------------------

export async function startRecorder(sessionId: string): Promise<void> {
  currentSessionId = sessionId
  chunkIndex = 0

  audioContext = new AudioContext({
    sampleRate: 44100,
    latencyHint: 'balanced',
  } as any)

  const recorder = (audioContext as any).createAudioRecorder({
    bitRate: 32000,
    sampleRate: 44100,
    channels: 1,
    format: 'aac',
    rotationInterval: CHUNK_DURATION_MS,
    outputDirectory: RNFS.DocumentDirectoryPath,
    fileNamePrefix: `call_${sessionId}_chunk_`,
    onFileRotation: (filePath: string, durationSec: number) => {
      handleChunkRotation(filePath, durationSec)
    },
  })

  await recorder.start()
  await showRecordingNotification()
}

function handleChunkRotation(filePath: string, durationSec: number): void {
  if (!currentSessionId) return
  const { v4: uuidv4 } = require('uuid')
  RNFS.stat(filePath)
    .then((stat: { size: number }) => {
      addChunk(currentSessionId!, {
        chunkId: uuidv4(),
        chunkIndex: chunkIndex++,
        filePath,
        sizeBytes: stat.size,
        durationSec,
      })
    })
    .catch(() => {
      addChunk(currentSessionId!, {
        chunkId: uuidv4(),
        chunkIndex: chunkIndex++,
        filePath,
        sizeBytes: Math.round(durationSec * 4000), // ~32kbps estimate
        durationSec,
      })
    })
}

export async function stopRecorder(): Promise<{ durationSec: number }> {
  if (!audioContext || !currentSessionId) return { durationSec: 0 }

  const recorder = (audioContext as any).recorder
  const result = await recorder?.stop()
  await dismissRecordingNotification()

  if (result?.filePath && result?.durationSec > 0) {
    handleChunkRotation(result.filePath, result.durationSec)
  }

  await audioContext.close()
  audioContext = null
  const totalDuration = result?.totalDurationSec ?? 0
  currentSessionId = null
  return { durationSec: totalDuration }
}

export async function pauseRecorder(): Promise<void> {
  if (!audioContext) return
  await audioContext.suspend()
}

export async function resumeRecorder(): Promise<void> {
  if (!audioContext) return
  await audioContext.resume()
}
