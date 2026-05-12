import React from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'

// ---------------------------------------------------------------------------
// SignInScreen — Auth placeholder
// Full implementation: Week 2
// ---------------------------------------------------------------------------

export default function SignInScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Kova</Text>
        <Text style={styles.tagline}>Revenue Intelligence</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 (555) 000-0000"
            keyboardType="phone-pad"
            autoComplete="tel"
            editable={false}
          />
          <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
            <Text style={styles.buttonText}>Send Code (Week 2)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 48,
  },
  form: {
    width: '100%',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
