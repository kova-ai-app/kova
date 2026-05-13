// apps/mobile/src/components/CallListItem.tsx
// Shared components used by both HomeScreen and CallsScreen.
// Previously duplicated verbatim in both files.

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { CallSummaryItem } from '../services/api'
import type { QueuedSession } from '../stores/upload-queue'
import { colors, font, radii, shadow, spacing } from '../theme'

// ---------------------------------------------------------------------------
// QueueWidget
// ---------------------------------------------------------------------------

export function QueueWidget({ sessions }: { sessions: QueuedSession[] }) {
  if (sessions.length === 0) return null
  return (
    <View style={styles.queueWidget}>
      <Text style={styles.queueTitle}>Upload Queue</Text>
      {sessions.map((session) => {
        const uploaded = (session.chunks ?? []).filter((c) => c.status === 'uploaded').length
        const total = (session.chunks ?? []).length
        const dotColor =
          session.overallStatus === 'uploading' ? colors.warning :
          session.overallStatus === 'failed' ? colors.danger :
          colors.textSecondary
        return (
          <View key={session.sessionId} style={styles.queueRow}>
            <View style={[styles.queueDot, { backgroundColor: dotColor }]} />
            <Text style={styles.queueText}>
              {session.overallStatus === 'uploading'
                ? `Uploading — ${uploaded}/${total} chunks`
                : session.overallStatus === 'failed'
                ? 'Upload failed — will retry when connected'
                : `Queued — ${total} chunk${total !== 1 ? 's' : ''}`}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'scored' ? colors.success :
    status === 'failed' ? colors.danger :
    status === 'processing' ? colors.warning :
    colors.textSecondary
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// CallRow
// ---------------------------------------------------------------------------

export function CallRow({
  item,
  onPress,
}: {
  item: CallSummaryItem
  onPress: () => void
}) {
  const date = new Date(item.recordedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const durationMin = Math.round(item.durationSec / 60)

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowDate}>{date}</Text>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.rowBody}>
        {item.customerName ? (
          <Text style={styles.customerName}>{item.customerName}</Text>
        ) : null}
        <Text style={styles.meta}>{durationMin} min · {item.jobType ?? 'unknown'}</Text>
      </View>
      {item.status === 'scored' && item.overallScore != null ? (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{item.overallScore}%</Text>
          {item.opportunityTotalLow != null && item.opportunityTotalLow > 0 ? (
            <>
              <Text style={styles.scoreLabel}>  Missed</Text>
              <Text style={[styles.scoreValue, { color: colors.missedRed }]}>
                ${item.opportunityTotalLow.toFixed(0)}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // QueueWidget
  queueWidget: {
    backgroundColor: colors.warningBg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  queueTitle: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.warningLabel,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  queueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  queueDot: { width: 8, height: 8, borderRadius: radii.full, marginRight: 8 },
  queueText: { fontFamily: font.regular, fontSize: 13, color: colors.warningText },

  // StatusBadge
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full },
  badgeText: { fontFamily: font.semibold, fontSize: 11, textTransform: 'capitalize' },

  // CallRow
  row: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    ...shadow.card,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBody: { marginTop: 4 },
  rowDate: { fontFamily: font.regular, fontSize: 13, color: colors.textSecondary },
  customerName: { fontFamily: font.semibold, fontSize: 15, color: colors.textPrimary },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  scoreLabel: { fontFamily: font.regular, fontSize: 12, color: colors.textSecondary },
  scoreValue: {
    fontFamily: font.extrabold,
    fontSize: 16,
    color: colors.scoreGreen,
    marginLeft: 4,
  },
})
