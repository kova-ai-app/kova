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
import { Audio } from 'expo-av'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { fetchCall, fetchCallAudioUrl, disputeOpportunity } from '../services/api'
import type { RootStackParamList } from '../navigation/types'
import { colors, font, radii, spacing, shadow } from '../theme'

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

  const soundRef = React.useRef<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [positionMs, setPositionMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [playbackFinished, setPlaybackFinished] = useState(false)

  // Cleanup sound on unmount
  React.useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync()
    }
  }, [])

  function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  async function togglePlayback() {
    if (soundRef.current && isPlaying) {
      await soundRef.current.pauseAsync()
      setIsPlaying(false)
      return
    }

    if (soundRef.current) {
      if (playbackFinished) {
        await soundRef.current.setPositionAsync(0)
        await soundRef.current.replayAsync()
      } else {
        await soundRef.current.playAsync()
      }
      setPlaybackFinished(false)
      setIsPlaying(true)
      return
    }

    // First play — fetch presigned URL and load audio
    try {
      const token = await getToken()
      if (!token) return
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      })
      const { url } = await fetchCallAudioUrl(token, callId)
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPositionMs(status.positionMillis)
            setDurationMs(status.durationMillis ?? 0)
            setIsPlaying(status.isPlaying)
            if (status.didJustFinish) {
              setIsPlaying(false)
              setPositionMs(0)
              setPlaybackFinished(true)
            }
          }
        }
      )
      soundRef.current = sound
      setPlaybackFinished(false)
      setIsPlaying(true)
    } catch {
      Alert.alert('Error', 'Could not load audio. Try again.')
    }
  }

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
        <ActivityIndicator size="large" color={colors.brand} />
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
  const opportunities = (data.opportunities ?? []) as Record<string, unknown>[]
  const feedbackItems = (data.feedback ?? []) as Record<string, unknown>[]
  const transcript = data.transcript as {
    segments?: Array<{ speaker: number; text: string; start: number; language?: string }>
  } | null
  const durationMin = Math.round((call.durationSec as number) / 60)
  const callStatus = call.status as string | undefined
  const hasTranscript = !!transcript?.segments?.length

  const statusCard =
    callStatus === 'pending'
      ? {
          title: 'Queued for processing',
          message: 'This call is waiting to be transcribed and scored.',
          style: styles.processingNotice,
          titleStyle: styles.processingNoticeTitle,
          messageStyle: styles.processingNoticeText,
        }
      : callStatus === 'processing'
        ? {
            title: 'Processing audio',
            message: 'Transcript and score are still being generated.',
            style: styles.processingNotice,
            titleStyle: styles.processingNoticeTitle,
            messageStyle: styles.processingNoticeText,
          }
        : callStatus === 'failed'
          ? {
              title: 'Processing failed',
              message: hasTranscript
                ? 'Transcript is available, but scoring did not complete.'
                : 'We could not generate a transcript or score for this call.',
              style: styles.failureNotice,
              titleStyle: styles.failureNoticeTitle,
              messageStyle: styles.failureNoticeText,
            }
          : null

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

      {statusCard ? (
        <View style={[styles.section, statusCard.style]}>
          <Text style={[styles.sectionTitle, statusCard.titleStyle]}>{statusCard.title}</Text>
          <Text style={statusCard.messageStyle}>{statusCard.message}</Text>
        </View>
      ) : null}

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

      {/* Feedback notes (read-only) */}
      {feedbackItems.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback Notes</Text>
          {feedbackItems.map((cp) => (
            <View key={cp.id as string} style={styles.feedbackRow}>
              <Text style={styles.feedbackText}>{cp.text as string}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Transcript */}
      {hasTranscript ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          {transcript!.segments!.map((seg, idx) => (
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
            onPress={() => void togglePlayback()}
          >
            <Text style={styles.audioBtnText}>
              {isPlaying ? '⏸  Pause' : '▶  Play Recording'}
            </Text>
          </TouchableOpacity>
          {durationMs > 0 ? (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.min((positionMs / durationMs) * 100, 100)}%` as any },
                ]}
              />
            </View>
          ) : null}
          {durationMs > 0 ? (
            <Text style={styles.timeText}>
              {formatTime(positionMs)} / {formatTime(durationMs)}
            </Text>
          ) : null}
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
  container: { flex: 1, backgroundColor: colors.bgPage },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  errorText: { fontFamily: font.regular, fontSize: 15, color: colors.danger, marginBottom: 12 },
  retryButton: { marginTop: 4 },
  retryText: { fontFamily: font.semibold, fontSize: 14, color: colors.brand },
  section: {
    backgroundColor: colors.bgCard,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaRow: { fontFamily: font.regular, fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  scoreBox: { alignItems: 'center', paddingVertical: spacing.sm },
  bigScore: { fontFamily: font.extrabold, fontSize: 56, color: colors.brand },
  confidenceText: { fontFamily: font.regular, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  missedRevenue: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  oppRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  oppMain: { flex: 1 },
  oppType: { fontFamily: font.semibold, fontSize: 14, color: colors.textPrimary, textTransform: 'capitalize' },
  oppStatus: { fontFamily: font.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  missedText: { color: colors.danger },
  oppRight: { alignItems: 'flex-end' },
  oppValue: { fontFamily: font.bold, fontSize: 13, color: colors.scoreGreen },
  disputeBtn: {
    marginTop: 4,
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  disputeBtnText: { fontFamily: font.semibold, fontSize: 12, color: colors.danger },
  feedbackRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.separator },
  feedbackText: { fontFamily: font.regular, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  transcriptRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.separator },
  speakerLabel: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  transcriptText: { fontFamily: font.regular, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  processingNotice: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  processingNoticeTitle: { color: colors.warningLabel, marginBottom: 6 },
  processingNoticeText: { fontFamily: font.medium, fontSize: 14, color: colors.warningText, lineHeight: 20 },
  failureNotice: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  failureNoticeTitle: { color: colors.danger, marginBottom: 6 },
  failureNoticeText: { fontFamily: font.medium, fontSize: 14, color: colors.danger, lineHeight: 20 },
  audioBtn: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  audioBtnText: { fontFamily: font.bold, color: '#FFFFFF', fontSize: 16 },
  progressContainer: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressBar: { height: 4, backgroundColor: colors.brand, borderRadius: 2 },
  timeText: { fontFamily: font.regular, fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
  },
  modalTitle: { fontFamily: font.bold, fontSize: 18, color: colors.textPrimary, marginBottom: spacing.sm },
  modalBody: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg, gap: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: 10 },
  cancelBtnText: { fontFamily: font.regular, fontSize: 15, color: colors.textSecondary },
  submitBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  submitBtnText: { fontFamily: font.semibold, fontSize: 15, color: '#FFFFFF' },
})
