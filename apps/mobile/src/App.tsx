import React, { useEffect } from 'react'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import * as SecureStore from 'expo-secure-store'
import { StatusBar } from 'expo-status-bar'
import * as Sentry from '@sentry/react-native'
import RootNavigator from './navigation/RootNavigator'

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
  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  )
}

export default function App() {
  if (!CLERK_KEY) {
    // Clerk not configured — show placeholder for Week 1 scaffold
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
