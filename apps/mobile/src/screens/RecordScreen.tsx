import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

// ---------------------------------------------------------------------------
// RecordScreen — Recording UI placeholder
// Full implementation: Week 3 (CRITICAL GATE)
// ---------------------------------------------------------------------------

export default function RecordScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Recording</Text>
        <Text style={styles.subtitle}>
          Week 3 — Background recording engine coming soon.
        </Text>

        <TouchableOpacity style={styles.button} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Start Recording</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
