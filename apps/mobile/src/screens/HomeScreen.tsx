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

type HomeNav = NativeStackNavigationProp<RootStackParamList>

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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['calls', 0],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return fetchCalls(token, 0)
    },
    staleTime: 30_000,
  })

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
        <Text style={styles.emptyTitle}>No calls yet</Text>
        <Text style={styles.emptyBody}>Tap Record to start your first call.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
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
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  list: { paddingVertical: 8 },
  row: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBody: { marginTop: 4 },
  rowDate: { fontSize: 13, color: '#6B7280' },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  scoreLabel: { fontSize: 12, color: '#6B7280' },
  scoreValue: { fontSize: 14, fontWeight: '700', color: '#16A34A', marginLeft: 4 },
  missed: { color: '#DC2626' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  errorText: { fontSize: 15, color: '#DC2626', marginBottom: 12 },
  retryText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
})
