import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { fetchCall, fetchCallAudioUrl, disputeOpportunity } from '../services/api'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'CallDetail'>

// ---------------------------------------------------------------------------
// Opportunity row with dispute button
// ---------------------------------------------------------------------------

function OpportunityRow({
  opp,
  onDispute,
}: {
  opp: Record<string, unknown>
  onDispute: (oppId: string) => void
}) {
  const triggered = opp.triggered as boolean
  const offered = opp.offered as boolean
  const type = (opp.type as string).replace(/_/g, ' ')
  const valueLow = opp.valueLow as number
  const valueHigh = opp.valueHigh as number
  const disputed = !!(opp.disputedAt as string | null)

  const isMissed = triggered && !offered && !opp.suppressedReason

  return (
    <View style={styles.oppRow}>
      <View style={styles.oppMain}>
        <Text style={styles.oppType}>{type}</Text>
        <Text style={[styles.oppStatus, isMissed && styles.missedText]}>
          {disputed ? 'Disputed' : isMissed ? 'Missed' : offered ? 'Offered' : 'Not triggered'}
        </Text>
      </View>
      {triggered ? (
        <View style={styles.oppRight}>
          {valueLow > 0 ? (
            <Text style={styles.oppValue}>
              ${valueLow.toFixed(0)}{valueHigh !== valueLow ? `–$${valueHigh.toFixed(0)}` : ''}
            </Text>
          ) : null}
          {isMissed && !disputed ? (
            <TouchableOpacity
              style={styles.disputeBtn}
              onPress={() => onDispute(opp.id as string)}
            >
              <Text style={styles.disputeBtnText}>Dispute</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// CallDetailScreen
// ---------------------------------------------------------------------------

export default function CallDetailScreen({ route }: Props) {
  const { callId } = route.params
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  const [disputeModalVisible, setDisputeModalVisible] = useState(false)
  const [disputeTargetId, setDisputeTargetId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')

  // Fetch call detail
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['call', callId],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return fetchCall(token, callId)
    },
  })

  // Fetch audio URL on demand
  const audioMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return fetchCallAudioUrl(token, callId)
    },
    onSuccess: (result) => {
      Alert.alert('Audio URL', result.url.substring(0, 80) + '…')
    },
    onError: () => {
      Alert.alert('Error', 'Could not load audio. Try again.')
    },
  })

  // Dispute mutation
  const disputeMutation = useMutation({
    mutationFn: async ({ oppId, reason }: { oppId: string; reason: string }) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return disputeOpportunity(token, oppId, reason)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['call', callId] })
      setDisputeModalVisible(false)
      setDisputeReason('')
      setDisputeTargetId(null)
    },
    onError: () => {
      Alert.alert('Error', 'Could not submit dispute. Try again.')
    },
  })

  function openDisputeModal(oppId: string) {
    setDisputeTargetId(oppId)
    setDisputeModalVisible(true)
  }

  function submitDispute() {
    if (!disputeTargetId || !disputeReason.trim()) {
      Alert.alert('Required', 'Please enter a dispute reason.')
      return
    }
    disputeMutation.mutate({ oppId: disputeTargetId, reason: disputeReason })
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load call detail.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => void refetch()}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const call = data.call as Record<string, unknown>
  const score = data.score as Record<string, unknown> | null
  const opportunities = data.opportunities as Record<string, unknown>[]
  const coachingPoints = data.coachingPoints as Record<string, unknown>[]
  const transcript = data.transcript as {
    segments?: Array<{ speaker: number; text: string; start: number; language?: string }>
  } | null
  const durationMin = Math.round((call.durationSec as number) / 60)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Info</Text>
        <Text style={styles.metaRow}>
          {new Date(call.recordedAt as string).toLocaleString()} · {durationMin} min
        </Text>
        {call.customerName ? (
          <Text style={styles.metaRow}>Customer: {call.customerName as string}</Text>
        ) : null}
        <Text style={styles.metaRow}>Type: {(call.jobType as string) ?? 'Unknown'}</Text>
        <Text style={styles.metaRow}>Status: {call.status as string}</Text>
      </View>

      {/* Score */}
      {score ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Score</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.bigScore}>{score.overallScore as number}%</Text>
            <Text style={styles.confidenceText}>
              {score.modelUsed as string} · {score.confidenceLevel as string} confidence
            </Text>
          </View>
          {(score.opportunityTotalLow as number) > 0 ? (
            <Text style={styles.missedRevenue}>
              Missed revenue: ${(score.opportunityTotalLow as number).toFixed(0)}
              –${(score.opportunityTotalHigh as number).toFixed(0)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Opportunities */}
      {opportunities.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opportunities</Text>
          {opportunities.map((opp) => (
            <OpportunityRow
              key={opp.id as string}
              opp={opp}
              onDispute={openDisputeModal}
            />
          ))}
        </View>
      ) : null}

      {/* Coaching notes (read-only) */}
      {coachingPoints.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coaching Notes</Text>
          {coachingPoints.map((cp) => (
            <View key={cp.id as string} style={styles.coachingRow}>
              <Text style={styles.coachingText}>{cp.text as string}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Transcript */}
      {transcript?.segments && transcript.segments.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          {transcript.segments.map((seg, idx) => (
            <View key={idx} style={styles.transcriptRow}>
              <Text style={styles.speakerLabel}>
                {`Speaker ${seg.speaker}${seg.language === 'es' ? '  (ES)' : ''}`}
              </Text>
              <Text style={styles.transcriptText}>{seg.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Audio playback */}
      {call.s3Key ? (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.audioBtn}
            onPress={() => audioMutation.mutate()}
            disabled={audioMutation.isPending}
          >
            {audioMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.audioBtnText}>▶  Play Recording</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Dispute modal */}
      <Modal
        visible={disputeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDisputeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Dispute Opportunity</Text>
            <Text style={styles.modalBody}>
              Explain why this opportunity should not have been flagged as missed:
            </Text>
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              placeholder="Enter reason..."
              value={disputeReason}
              onChangeText={setDisputeReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setDisputeModalVisible(false)
                  setDisputeReason('')
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={submitDispute}
                disabled={disputeMutation.isPending}
              >
                {disputeMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, color: '#DC2626', marginBottom: 12 },
  retryButton: { marginTop: 4 },
  retryText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow: { fontSize: 14, color: '#374151', marginBottom: 4 },
  scoreBox: { alignItems: 'center', paddingVertical: 8 },
  bigScore: { fontSize: 56, fontWeight: '800', color: '#2563EB' },
  confidenceText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  missedRevenue: { fontSize: 14, color: '#DC2626', fontWeight: '600', textAlign: 'center', marginTop: 8 },
  oppRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  oppMain: { flex: 1 },
  oppType: { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  oppStatus: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  missedText: { color: '#DC2626' },
  oppRight: { alignItems: 'flex-end' },
  oppValue: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  disputeBtn: { marginTop: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  disputeBtnText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  coachingRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  coachingText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  transcriptRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  speakerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  transcriptText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  audioBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  audioBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  modalBody: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  reasonInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827', minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelBtnText: { fontSize: 15, color: '#6B7280' },
  submitBtn: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  submitBtnText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
})
