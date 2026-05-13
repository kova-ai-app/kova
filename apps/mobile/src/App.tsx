import React, { useEffect } from 'react'
import { Alert, Platform } from 'react-native'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import * as SecureStore from 'expo-secure-store'
import { StatusBar } from 'expo-status-bar'
import * as Sentry from '@sentry/react-native'
import NetInfo from '@react-native-community/netinfo'
import RootNavigator from './navigation/RootNavigator'
import { navigationRef } from './navigation/RootNavigator'
import { getIncompleteSession, setSessionStatus } from './stores/upload-queue'
import { useRecordingStore } from './stores/recording-store'
import { runUploadManager } from './services/upload-manager'
import { registerForPushNotifications, addCallScoredListener } from './services/notifications'

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
  const { getToken } = useAuth()

  const triggerUpload = async () => {
    try {
      const token = await getToken()
      if (!token) return
      await runUploadManager({
        apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://kova.vercel.app',
        authToken: token,
      })
    } catch {
      // Silent — will retry on next trigger
    }
  }

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
              triggerUpload()
            },
          },
        ]
      )
    }

    // Run upload manager on app open
    triggerUpload()

    // Run upload manager on connectivity restored
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) triggerUpload()
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    async function registerPush() {
      const token = await registerForPushNotifications()
      if (!token) return
      const authToken = await getToken()
      if (!authToken) return
      try {
        await fetch(
          `${process.env.EXPO_PUBLIC_API_URL ?? 'https://kova.vercel.app'}/api/notifications/register`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ token, platform: Platform.OS }),
          }
        )
      } catch {
        // Silent — will retry on next app open
      }
    }
    registerPush()
  }, [])

  useEffect(() => {
    const subscription = addCallScoredListener((callId) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('CallDetail', { callId })
      }
    })
    return () => subscription.remove()
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
    // Clerk not configured — show scaffold without upload manager
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
