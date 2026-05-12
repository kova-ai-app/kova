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
import { setJobMetadata, setSessionStatus } from '../stores/upload-queue'
import { useRecordingStore } from '../stores/recording-store'

type Props = NativeStackScreenProps<RootStackParamList, 'JobTagging'>

export default function JobTaggingScreen({ navigation, route }: Props) {
  const { sessionId } = route.params
  const [customerName, setCustomerName] = useState('')
  const [jobType, setJobType] = useState<'drain' | 'plumbing' | 'both'>('drain')
  const [notes, setNotes] = useState('')
  const setStatus = useRecordingStore((s) => s.setStatus)

  const handleSubmit = () => {
    setJobMetadata(sessionId, {
      customerName: customerName.trim() || undefined,
      jobType,
      notes: notes.trim() || undefined,
    })
    setSessionStatus(sessionId, 'uploading')
    setStatus('uploading')
    navigation.navigate('Main')
  }

  const handleSkip = () => {
    setSessionStatus(sessionId, 'uploading')
    setStatus('uploading')
    navigation.navigate('Main')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Tag This Call</Text>
        <Text style={styles.subtitle}>Optional — helps track revenue per job type</Text>

        <Text style={styles.label}>Customer Name</Text>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="e.g. John Smith"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
        />

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
          placeholderTextColor="#9CA3AF"
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 24,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', marginBottom: 24, gap: 8 },
  segment: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  segmentActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  segmentTextActive: { color: '#FFFFFF' },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  skipButton: { padding: 16, alignItems: 'center' },
  skipButtonText: { fontSize: 16, color: '#6B7280' },
})
