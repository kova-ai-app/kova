import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

// ---------------------------------------------------------------------------
// ProfileScreen — User profile placeholder
// Full implementation: Week 7
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Sign-in and profile settings coming in Week 2.
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
  },
})
