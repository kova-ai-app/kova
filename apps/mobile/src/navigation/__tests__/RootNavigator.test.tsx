import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer'
import type { ReactNode } from 'react'

type ScreenDefinition = {
  name: string
  options?: {
    headerShown?: boolean
    title?: string
  }
}

type NavigatorProps = {
  children?: ReactNode
}

const screenProps: ScreenDefinition[] = []

const mockUseAuth = vi.fn()
const mockUseRecordingStore = vi.fn((selector: (state: { status: string; sessionId: string | null; callId: string | null }) => unknown) =>
  selector({ status: 'idle', sessionId: null, callId: null })
)

vi.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children?: ReactNode }) => children,
  createNavigationContainerRef: () => ({ isReady: () => false, navigate: vi.fn() }),
}))

vi.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: NavigatorProps) => React.createElement(React.Fragment, null, children),
    Screen: (props: ScreenDefinition) => {
      screenProps.push(props)
      return null
    },
  }),
}))

vi.mock('@clerk/clerk-expo', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../../stores/recording-store', () => ({
  useRecordingStore: (selector: (state: { status: string; sessionId: string | null; callId: string | null }) => unknown) =>
    mockUseRecordingStore(selector),
}))

vi.mock('../TabNavigator', () => ({ default: () => null }))
vi.mock('../../screens/SignInScreen', () => ({ default: () => null }))
vi.mock('../../screens/JobTaggingScreen', () => ({ default: () => null }))
vi.mock('../../screens/CallDetailScreen', () => ({ default: () => null }))
vi.mock('../../screens/SettingsScreen', () => ({ default: () => null }))

beforeEach(() => {
  screenProps.length = 0
  mockUseAuth.mockReset()
  vi.resetModules()
})

afterEach(() => {
  delete process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
})

describe('RootNavigator', () => {
  it('omits the settings route when signed out', async () => {
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mobile'
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false })

    const { default: RootNavigator } = await import('../RootNavigator')

    act(() => {
      TestRenderer.create(<RootNavigator />)
    })

    expect(screenProps.map((screen) => screen.name)).toContain('SignIn')
    expect(screenProps.map((screen) => screen.name)).not.toContain('Settings')
  })

  it('includes the settings route when signed in', async () => {
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mobile'
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true })

    const { default: RootNavigator } = await import('../RootNavigator')

    act(() => {
      TestRenderer.create(<RootNavigator />)
    })

    expect(screenProps.map((screen) => screen.name)).toEqual(['Main', 'Settings', 'JobTagging', 'CallDetail'])
  })

  it('drops the settings route when auth transitions to signed out', async () => {
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mobile'
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: true })

    const { default: RootNavigator } = await import('../RootNavigator')

    let renderer: ReactTestRenderer
    act(() => {
      renderer = TestRenderer.create(<RootNavigator />)
    })

    expect(screenProps.map((screen) => screen.name)).toContain('Settings')

    screenProps.length = 0
    mockUseAuth.mockReturnValue({ isLoaded: true, isSignedIn: false })

    act(() => {
      renderer!.update(<RootNavigator />)
    })

    expect(screenProps.map((screen) => screen.name)).toContain('SignIn')
    expect(screenProps.map((screen) => screen.name)).not.toContain('Settings')
  })
})
