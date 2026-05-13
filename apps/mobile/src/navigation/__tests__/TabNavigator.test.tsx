import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TestRenderer, { act } from 'react-test-renderer'

type ScreenDefinition = {
  name: string
  options?: {
    headerShown?: boolean
  }
}

type NavigatorProps = {
  screenOptions: {
    headerRight?: unknown
  }
  children?: React.ReactNode
}

const screenProps: ScreenDefinition[] = []
let navigatorProps: NavigatorProps | null = null

vi.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: (props: NavigatorProps) => {
      navigatorProps = props
      return React.createElement(React.Fragment, null, props.children)
    },
    Screen: (props: ScreenDefinition) => {
      screenProps.push(props)
      return null
    },
  }),
}))

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }))
vi.mock('../../screens/HomeScreen', () => ({ default: () => null }))
vi.mock('../../screens/AskScreen', () => ({ default: () => null }))
vi.mock('../../screens/RecordScreen', () => ({ default: () => null }))
vi.mock('../../components/SettingsButton', () => ({ default: () => null }))

beforeEach(() => {
  screenProps.length = 0
  navigatorProps = null
  vi.resetModules()
})

describe('TabNavigator', () => {
  it('keeps only Home, Ask, and Record tabs and exposes a shared settings button', async () => {
    const { default: TabNavigator } = await import('../TabNavigator')

    act(() => {
      TestRenderer.create(<TabNavigator />)
    })

    expect(screenProps.map((screen) => screen.name)).toEqual(['Home', 'Ask', 'Record'])
    expect(navigatorProps?.screenOptions.headerRight).toEqual(expect.any(Function))
    expect(screenProps.find((screen) => screen.name === 'Record')?.options?.headerShown).toBe(false)
  })
})
