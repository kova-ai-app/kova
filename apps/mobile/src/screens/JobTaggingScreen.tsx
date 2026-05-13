import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { colors, font, radii, spacing } from '../theme'
import { useAuth } from '@clerk/clerk-expo'
import { setJobMetadata } from '../stores/upload-queue'
import { useRecordingStore } from '../stores/recording-store'
import { triggerUpload } from '../services/upload-trigger'

type Props = NativeStackScreenProps<RootStackParamList, 'JobTagging'>

export default function JobTaggingScreen({ navigation, route }: Props) {
  const { sessionId } = route.params
  const [jobType, setJobType] = useState<'drain' | 'plumbing' | 'both'>('drain')
  const [notes, setNotes] = useState('')
  const setStatus = useRecordingStore((s) => s.setStatus)
  const reset = useRecordingStore((s) => s.reset)
  const { getToken } = useAuth()

  const handleSubmit = async () => {
    setJobMetadata(sessionId, {
      jobType,
      notes: notes.trim() || undefined,
    })
    setStatus('uploading')
    const uploadPromise = triggerUpload(getToken)
    reset()
    await uploadPromise
    navigation.navigate('Main')
  }

  const handleSkip = async () => {
    setStatus('uploading')
    const uploadPromise = triggerUpload(getToken)
    reset()
    await uploadPromise
    navigation.navigate('Main')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Tag This Call</Text>
        <Text style={styles.subtitle}>Optional — helps track revenue per job type</Text>

        <Text style={styles.label}>Job Type</Text>
        <View style={styles.segmented}>
          {(['drain', 'plumbing', 'both'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.segment, jobType === type && styles.segmentActive]}
              onPress={() => setJobType(type)}
            >
              <Text style={[styles.segmentText, jobType === type && styles.segmentTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes about this call..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Done — Start Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: font.bold, color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: font.regular, color: colors.textSecondary, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', fontFamily: font.semibold, color: colors.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    fontSize: 16,
    fontFamily: font.regular,
    color: colors.textPrimary,
    marginBottom: 24,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', marginBottom: 24, gap: 8 },
  segment: {
    flex: 1,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
  },
  segmentActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  segmentText: { fontSize: 14, fontWeight: '600', fontFamily: font.semibold, color: colors.textSecondary },
  segmentTextActive: { color: '#FFFFFF' },
  submitButton: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: { fontSize: 16, fontWeight: '700', fontFamily: font.bold, color: '#FFFFFF' },
  skipButton: { padding: 16, alignItems: 'center' },
  skipButtonText: { fontSize: 16, fontFamily: font.regular, color: colors.textSecondary },
})
