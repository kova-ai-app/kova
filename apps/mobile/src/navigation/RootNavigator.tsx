import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '@clerk/clerk-expo'
import TabNavigator from './TabNavigator'
import SignInScreen from '../screens/SignInScreen'
import type { RootStackParamList } from './types'

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
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isSignedIn ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        )}
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
