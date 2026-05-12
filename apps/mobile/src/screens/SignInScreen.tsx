import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useSignIn } from '@clerk/clerk-expo'

// ---------------------------------------------------------------------------
// SignInScreen — Phone OTP authentication
// Two-phase flow: phone number → SMS code → verified session
// Falls back to a placeholder when Clerk is not configured.
// ---------------------------------------------------------------------------

function SignInPlaceholder() {
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
            editable={false}
          />
          <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
            <Text style={styles.buttonText}>Sign In (Clerk not configured)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function OTPSignIn() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const [phase, setPhase] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode() {
    if (!isLoaded || !signIn) return
    setLoading(true)
    setError(null)
    try {
      await signIn.create({ identifier: phone })
      setPhase('code')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send code'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode() {
    if (!isLoaded || !signIn) return
    setLoading(true)
    setError(null)
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'phone_code',
        code,
      })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      } else {
        setError('Verification incomplete. Please try again.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Kova</Text>
        <Text style={styles.tagline}>Revenue Intelligence</Text>

        <View style={styles.form}>
          {phase === 'phone' ? (
            <>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.hint}>Enter in E.164 format: +15551234567</Text>
              <TextInput
                style={styles.input}
                placeholder="+15551234567"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.button, (loading || !phone) && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading || !phone}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Enter 6-digit code</Text>
              <Text style={styles.hint}>Sent to {phone}</Text>
              <TextInput
                style={styles.input}
                placeholder="000000"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                value={code}
                onChangeText={setCode}
                maxLength={6}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.button, (loading || code.length < 6) && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={loading || code.length < 6}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setPhase('phone')
                  setCode('')
                  setError(null)
                }}
              >
                <Text style={styles.back}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </View>
  )
}

const IS_CLERK_CONFIGURED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function SignInScreen() {
  if (!IS_CLERK_CONFIGURED) return <SignInPlaceholder />
  return <OTPSignIn />
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { fontSize: 40, fontWeight: '800', color: '#2563EB', marginBottom: 4 },
  tagline: { fontSize: 14, color: '#6B7280', marginBottom: 48 },
  form: { width: '100%', gap: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },
  hint: { fontSize: 12, color: '#6B7280', marginTop: -4 },
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
  buttonDisabled: { backgroundColor: '#93C5FD' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  back: { color: '#2563EB', textAlign: 'center', marginTop: 8 },
  error: { color: '#DC2626', fontSize: 14, textAlign: 'center' },
})
