import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '@clerk/clerk-expo'
import TabNavigator from './TabNavigator'
import SignInScreen from '../screens/SignInScreen'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  // When Clerk is not configured (Week 1 scaffold), default to signed-in view
  let isSignedIn = false
  let isLoaded = true

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuth()
    isSignedIn = auth.isSignedIn ?? false
    isLoaded = auth.isLoaded
  } catch {
    // ClerkProvider not present — proceed as signed in for scaffold
    isSignedIn = true
  }

  if (!isLoaded) return null

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
