import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DeviceInfo from 'react-native-device-info'
import { colors, font, radii, spacing } from '../theme'
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
    error,
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

  useEffect(() => {
    if (error) {
      Alert.alert('Recording Error', error)
    }
  }, [error])

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
  // Dark bg intentional — full-screen recording mode
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  dot: { width: 24, height: 24, borderRadius: radii.full, backgroundColor: '#EF4444', marginBottom: spacing.xl },
  timer: {
    fontFamily: font.regular,
    fontSize: 48,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    fontVariant: ['tabular-nums'] as any,
  },
  chunkInfo: { fontFamily: font.regular, fontSize: 14, color: '#6B7280', marginBottom: spacing.xxl },
  batteryWarning: {
    backgroundColor: '#7C2D12',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  batteryWarningText: { fontFamily: font.semibold, color: '#FEF2F2', fontSize: 14 },
  recordButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: radii.full,
  },
  recordButtonText: { fontFamily: font.bold, color: '#FFFFFF', fontSize: 18 },
  controls: { flexDirection: 'row', gap: spacing.lg },
  pauseButton: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#374151',
  },
  pauseButtonText: { fontFamily: font.semibold, color: '#FFFFFF', fontSize: 16 },
  stopButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radii.full,
  },
  stopButtonText: { fontFamily: font.bold, color: '#FFFFFF', fontSize: 16 },
})
