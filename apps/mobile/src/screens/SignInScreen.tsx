import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useSignIn, isClerkAPIResponseError } from '@clerk/clerk-expo'
import { colors, font, radii, spacing } from '../theme'

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
      // Step 1: Look up account by phone number
      const result = await signIn.create({ identifier: phone })

      // Step 2: Find the phone_code first factor and prepare it (sends the SMS)
      const phoneCodeFactor = result.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'phone_code'
      ) as { strategy: 'phone_code'; phoneNumberId: string } | undefined

      if (!phoneCodeFactor) {
        setError('Phone authentication is not available for this account.')
        return
      }

      await signIn.prepareFirstFactor({
        strategy: 'phone_code',
        phoneNumberId: phoneCodeFactor.phoneNumberId,
      })

      setPhase('code')
    } catch (err: unknown) {
      const msg = isClerkAPIResponseError(err)
        ? (err.errors[0]?.longMessage ?? err.errors[0]?.message ?? 'Failed to send code')
        : err instanceof Error
          ? err.message
          : 'Failed to send code'
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
      const msg = isClerkAPIResponseError(err)
        ? (err.errors[0]?.longMessage ?? err.errors[0]?.message ?? 'Invalid code')
        : err instanceof Error
          ? err.message
          : 'Invalid code'
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
              <Text style={styles.helperText}>Enter in E.164 format: +15551234567</Text>
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
              <Text style={styles.helperText}>Sent to {phone}</Text>
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
                style={styles.backButton}
                onPress={() => {
                  setPhase('phone')
                  setCode('')
                  setError(null)
                }}
              >
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  container: { flex: 1, backgroundColor: colors.bgPage },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  logo: { fontFamily: font.extrabold, fontSize: 40, color: colors.brand, marginBottom: 4 },
  tagline: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary, marginBottom: 48 },
  form: { width: '100%', gap: 12 },
  label: {
    fontFamily: font.medium,
    fontSize: 14,
    color: colors.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  button: {
    width: '100%',
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { backgroundColor: '#93C5FD' },
  buttonText: { fontFamily: font.bold, color: '#FFFFFF', fontSize: 16 },
  errorText: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  backButton: { marginTop: spacing.lg },
  backText: { fontFamily: font.medium, fontSize: 14, color: colors.brand },
  helperText: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
})
