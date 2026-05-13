import React, { useEffect } from 'react'
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '@clerk/clerk-expo'
import TabNavigator from './TabNavigator'
import SignInScreen from '../screens/SignInScreen'
import JobTaggingScreen from '../screens/JobTaggingScreen'
import CallDetailScreen from '../screens/CallDetailScreen'
import { useRecordingStore } from '../stores/recording-store'
import type { RootStackParamList } from './types'

export const navigationRef = createNavigationContainerRef<RootStackParamList>()

const Stack = createNativeStackNavigator<RootStackParamList>()
const IS_CLERK_CONFIGURED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

// Renders the correct screen based on sign-in state. Must be a child of
// ClerkProvider so useAuth() is always called unconditionally.
function AuthenticatedRoot() {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return null
  return <StackNav isSignedIn={isSignedIn ?? false} />
}

function StackNav({ isSignedIn }: { isSignedIn: boolean }) {
  const status = useRecordingStore((s) => s.status)
  const sessionId = useRecordingStore((s) => s.sessionId)
  const callId = useRecordingStore((s) => s.callId)

  useEffect(() => {
    if (status === 'stopped' && sessionId && callId && navigationRef.isReady()) {
      navigationRef.navigate('JobTagging', { sessionId, callId })
    }
  }, [status, sessionId, callId])

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isSignedIn ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        )}
        <Stack.Screen
          name="JobTagging"
          component={JobTaggingScreen}
          options={{ title: 'Tag This Call' }}
        />
        <Stack.Screen
          name="CallDetail"
          component={CallDetailScreen}
          options={{ title: 'Call Detail', headerShown: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function RootNavigator() {
  // When Clerk is not configured (scaffold), skip auth and go straight to app
  if (!IS_CLERK_CONFIGURED) {
    return <StackNav isSignedIn={true} />
  }
  return <AuthenticatedRoot />
}
