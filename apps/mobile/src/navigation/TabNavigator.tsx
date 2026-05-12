import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import HomeScreen from '../screens/HomeScreen'
import RecordScreen from '../screens/RecordScreen'
import ProfileScreen from '../screens/ProfileScreen'
import type { TabParamList } from './types'

const Tab = createBottomTabNavigator<TabParamList>()

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2563EB',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Calls' }}
      />
      <Tab.Screen
        name="Record"
        component={RecordScreen}
        options={{ title: 'Record' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  )
}
