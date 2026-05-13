// apps/mobile/src/navigation/TabNavigator.tsx
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import HomeScreen from '../screens/HomeScreen'
import AskScreen from '../screens/AskScreen'
import RecordScreen from '../screens/RecordScreen'
import CallsScreen from '../screens/CallsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import type { TabParamList } from './types'
import { colors, font } from '../theme'

const Tab = createBottomTabNavigator<TabParamList>()

// Shared header style — dark warm, matches web sidebar
const headerStyle = {
  backgroundColor: colors.navBg,
  borderBottomColor: colors.navBorder,
  borderBottomWidth: 1,
  elevation: 0,
  shadowOpacity: 0,
} as const

const headerTitleStyle = {
  fontFamily: font.semibold,
  fontSize: 17,
  color: colors.textOnDark,
} as const

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.navActive,
        tabBarInactiveTintColor: colors.navInactive,
        tabBarStyle: {
          backgroundColor: colors.navBg,
          borderTopColor: colors.navBorder,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 64,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerStyle,
        headerTitleStyle,
        headerTintColor: colors.textOnDark,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Ask"
        component={AskScreen}
        options={{
          title: 'Ask',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Record"
        component={RecordScreen}
        options={{
          title: 'Record',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Calls"
        component={CallsScreen}
        options={{
          title: 'Calls',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="call-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
