import React from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { fetchCalls } from '../services/api'
import type { CallSummaryItem } from '../services/api'
import type { RootStackParamList } from '../navigation/types'
import { getPendingSessions } from '../stores/upload-queue'
import type { QueuedSession } from '../stores/upload-queue'

type HomeNav = NativeStackNavigationProp<RootStackParamList>

// ---------------------------------------------------------------------------
// Upload queue widget
// ---------------------------------------------------------------------------

function QueueWidget({ sessions }: { sessions: QueuedSession[] }) {
  if (sessions.length === 0) return null
  return (
    <View style={styles.queueWidget}>
      <Text style={styles.queueTitle}>Upload Queue</Text>
      {sessions.map((session) => {
      const uploaded = (session.chunks ?? []).filter((c) => c.status === 'uploaded').length
        const total = (session.chunks ?? []).length
        return (
          <View key={session.sessionId} style={styles.queueRow}>
            <View
              style={[
                styles.queueDot,
                {
                  backgroundColor:
                    session.overallStatus === 'uploading' ? '#D97706' :
                    session.overallStatus === 'failed' ? '#DC2626' :
                    '#6B7280',
                },
              ]}
            />
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
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'scored' ? '#16A34A' :
    status === 'failed' ? '#DC2626' :
    status === 'processing' ? '#D97706' :
    '#6B7280'
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Call row
// ---------------------------------------------------------------------------

function CallRow({ item, onPress }: { item: CallSummaryItem; onPress: () => void }) {
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
              <Text style={[styles.scoreValue, styles.missed]}>
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
// HomeScreen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const { getToken } = useAuth()
  const navigation = useNavigation<HomeNav>()

  const [queuedSessions, setQueuedSessions] = React.useState<QueuedSession[]>([])

  React.useEffect(() => {
    setQueuedSessions(getPendingSessions())
    const interval = setInterval(() => {
      setQueuedSessions(getPendingSessions())
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['calls', 0],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return fetchCalls(token, 0)
    },
    staleTime: 30_000,
  })

  const [refreshing, setRefreshing] = React.useState(false)
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load calls.</Text>
        <TouchableOpacity onPress={() => void refetch()}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const calls = data?.data ?? []

  if (calls.length === 0) {
    return (
      <View style={styles.center}>
        <QueueWidget sessions={queuedSessions} />
        <Text style={styles.emptyTitle}>No calls yet</Text>
        <Text style={styles.emptyBody}>Tap Record to start your first call.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <QueueWidget sessions={queuedSessions} />
      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CallRow
            item={item}
            onPress={() => navigation.navigate('CallDetail', { callId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  list: { paddingVertical: 8 },
  row: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBody: { marginTop: 4 },
  rowDate: { fontSize: 13, color: '#6B7280' },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  scoreLabel: { fontSize: 12, color: '#6B7280' },
  scoreValue: { fontSize: 16, fontWeight: '800', color: '#16A34A', marginLeft: 4 },
  missed: { color: '#DC2626' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  errorText: { fontSize: 15, color: '#DC2626', marginBottom: 12 },
  retryText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  queueWidget: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  queueTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  queueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  queueDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  queueText: { fontSize: 13, color: '#78350F' },
})
