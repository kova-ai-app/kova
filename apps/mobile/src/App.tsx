import React, { useEffect } from 'react'
import { Alert } from 'react-native'
import { ClerkProvider } from '@clerk/clerk-expo'
import * as SecureStore from 'expo-secure-store'
import { StatusBar } from 'expo-status-bar'
import * as Sentry from '@sentry/react-native'
import RootNavigator from './navigation/RootNavigator'
import { getIncompleteSession, setSessionStatus } from './stores/upload-queue'
import { useRecordingStore } from './stores/recording-store'

// ---------------------------------------------------------------------------
// Sentry — initialize before any rendering
// ---------------------------------------------------------------------------
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.APP_ENV ?? 'development',
    tracesSampleRate: 1.0,
    debug: __DEV__,
  })
}

// ---------------------------------------------------------------------------
// Clerk token cache — uses SecureStore for persistence
// ---------------------------------------------------------------------------
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      // ignore
    }
  },
}

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

function AppInner() {
  useEffect(() => {
    // Check for incomplete recording session on startup
    const incomplete = getIncompleteSession()
    if (incomplete) {
      Alert.alert(
        'Incomplete Recording',
        'A recording session was interrupted. What would you like to do?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setSessionStatus(incomplete.sessionId, 'failed')
              useRecordingStore.getState().reset()
            },
          },
          {
            text: 'Upload What Was Recorded',
            onPress: () => {
              setSessionStatus(incomplete.sessionId, 'uploading')
              useRecordingStore.getState().setStatus('uploading')
            },
          },
        ]
      )
    }
  }, [])

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  )
}

export default function App() {
  if (!CLERK_KEY) {
    // Clerk not configured — show placeholder for scaffold
    return (
      <>
        <StatusBar style="auto" />
        <RootNavigator />
      </>
    )
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <AppInner />
    </ClerkProvider>
  )
}
