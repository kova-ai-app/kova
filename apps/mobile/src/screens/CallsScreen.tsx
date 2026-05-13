// apps/mobile/src/screens/CallsScreen.tsx
import React from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { fetchCalls } from '../services/api'
import type { RootStackParamList } from '../navigation/types'
import { getPendingSessions } from '../stores/upload-queue'
import type { QueuedSession } from '../stores/upload-queue'
import { QueueWidget, CallRow } from '../components/CallListItem'
import { colors, font, spacing } from '../theme'

type CallsNav = NativeStackNavigationProp<RootStackParamList>

export default function CallsScreen() {
  const { getToken } = useAuth()
  const navigation = useNavigation<CallsNav>()
  const [queuedSessions, setQueuedSessions] = React.useState<QueuedSession[]>([])

  React.useEffect(() => {
    setQueuedSessions(getPendingSessions())
    const interval = setInterval(() => setQueuedSessions(getPendingSessions()), 5000)
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
        <ActivityIndicator size="large" color={colors.brand} />
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
        <Text style={styles.emptyBody}>Your recorded calls will appear here.</Text>
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
  container: { flex: 1, backgroundColor: colors.bgPage },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  list: { paddingVertical: spacing.sm },
  separator: { height: 1, backgroundColor: colors.separator, marginHorizontal: spacing.lg },
  emptyTitle: { fontFamily: font.semibold, fontSize: 18, color: colors.textPrimary, marginBottom: 8 },
  emptyBody: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  errorText: { fontFamily: font.regular, fontSize: 15, color: colors.danger, marginBottom: 12 },
  retryText: { fontFamily: font.semibold, fontSize: 14, color: colors.brand },
})
