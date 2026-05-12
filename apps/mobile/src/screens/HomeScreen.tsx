import React from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'

// ---------------------------------------------------------------------------
// HomeScreen — Call list placeholder
// Full implementation: Week 7
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No calls yet</Text>
        <Text style={styles.emptyBody}>
          Tap Record to start your first call.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
})
