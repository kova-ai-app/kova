import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Animated,
} from 'react-native'
import DeviceInfo from 'react-native-device-info'
import { useAuth, useOrganization } from '@clerk/clerk-expo'
import { useRecordingStore } from '../stores/recording-store'
import ConsentModal from '../components/ConsentModal'

const IS_CLERK_CONFIGURED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function RecordScreen() {
  const {
    status,
    elapsedSec,
    chunkCount,
    batteryLevel,
    startRecording,
    consentGranted,
    consentDeclined,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setBatteryLevel,
    incrementElapsed,
  } = useRecordingStore()

  const pulseAnim = useRef(new Animated.Value(1)).current
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const batteryRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pulsing dot animation while recording
  useEffect(() => {
    if (status === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start()
      timerRef.current = setInterval(incrementElapsed, 1000)
      batteryRef.current = setInterval(async () => {
        const level = await DeviceInfo.getBatteryLevel()
        setBatteryLevel(Math.round(level * 100))
      }, 60000)
      DeviceInfo.getBatteryLevel().then((l) => setBatteryLevel(Math.round(l * 100)))
    } else {
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)
      if (timerRef.current) clearInterval(timerRef.current)
      if (batteryRef.current) clearInterval(batteryRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (batteryRef.current) clearInterval(batteryRef.current)
    }
  }, [status])

  const { userId: clerkUserId } = useAuth()
  const { organization: clerkOrganization } = useOrganization()

  const userId = IS_CLERK_CONFIGURED ? clerkUserId : 'dev-tech-1'
  const organization = IS_CLERK_CONFIGURED ? clerkOrganization : { id: 'dev-org-1' }

  const handlePressRecord = async () => {
    if (!userId || !organization?.id) {
      Alert.alert('Not signed in', 'Please sign in before recording.')
      return
    }
    try {
      await startRecording({ techId: userId, companyId: organization.id })
    } catch (e: any) {
      if (e.message === 'Recording already active') {
        Alert.alert('Recording Already Active', 'Stop the current recording before starting a new one.')
      } else if (e.message === 'INSUFFICIENT_DISK_SPACE') {
        Alert.alert('Not Enough Storage', 'You need at least 200 MB free to record.')
      } else {
        Alert.alert('Permission Required', 'Microphone access is required to record calls.')
      }
    }
  }

  const handleStop = async () => {
    await stopRecording()
    // Navigation to JobTagging is triggered by RootNavigator
    // watching status === 'stopped' via useRecordingStore
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isActive = isRecording || isPaused

  return (
    <SafeAreaView style={styles.container}>
      <ConsentModal
        visible={status === 'consent_shown'}
        onConsent={consentGranted}
        onDecline={consentDeclined}
      />

      <View style={styles.center}>
        {/* Pulsing dot */}
        {isRecording && (
          <Animated.View style={[styles.dot, { transform: [{ scale: pulseAnim }] }]} />
        )}

        {/* Timer */}
        {isActive && (
          <Text style={styles.timer}>{formatTime(elapsedSec)}</Text>
        )}

        {/* Chunk counter */}
        {isActive && chunkCount > 0 && (
          <Text style={styles.chunkInfo}>{chunkCount} chunk{chunkCount !== 1 ? 's' : ''} saved</Text>
        )}

        {/* Battery warning */}
        {batteryLevel !== null && batteryLevel <= 20 && isActive && (
          <View style={styles.batteryWarning}>
            <Text style={styles.batteryWarningText}>⚠️ Battery at {batteryLevel}%</Text>
          </View>
        )}

        {/* Main record button */}
        {!isActive && (
          <TouchableOpacity style={styles.recordButton} onPress={handlePressRecord}>
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        )}

        {/* Controls when recording */}
        {isActive && (
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={isRecording ? pauseRecording : resumeRecording}
            >
              <Text style={styles.pauseButtonText}>{isRecording ? 'Pause' : 'Resume'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EF4444', marginBottom: 24 },
  timer: { fontSize: 48, fontWeight: '200', color: '#FFFFFF', marginBottom: 8, fontVariant: ['tabular-nums'] },
  chunkInfo: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  batteryWarning: {
    backgroundColor: '#7C2D12',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  batteryWarningText: { color: '#FEF2F2', fontSize: 14, fontWeight: '600' },
  recordButton: {
    backgroundColor: '#EF4444',
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  recordButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  controls: { flexDirection: 'row', gap: 16, marginTop: 32 },
  pauseButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  pauseButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  stopButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  stopButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
})
