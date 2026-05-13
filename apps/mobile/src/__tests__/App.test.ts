import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidElement, type ReactNode } from 'react'

vi.mock('@clerk/clerk-expo', () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ getToken: async () => null }),
}))

vi.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
}))

vi.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}))

vi.mock('@sentry/react-native', () => ({
  init: () => {},
}))

vi.mock('../navigation/RootNavigator', () => ({
  default: () => null,
  navigationRef: {
    isReady: () => false,
    navigate: () => {},
  },
}))

vi.mock('../stores/upload-queue', () => ({
  getIncompleteSession: () => null,
  setSessionStatus: () => {},
}))

vi.mock('../stores/recording-store', () => ({
  useRecordingStore: {
    getState: () => ({
      reset: () => {},
      setStatus: () => {},
    }),
  },
}))

vi.mock('../services/upload-manager', () => ({
  runUploadManager: async () => {},
}))

vi.mock('../services/notifications', () => ({
  registerForPushNotifications: async () => null,
  addCallScoredListener: () => ({ remove: () => {} }),
}))

function containsElementType(node: ReactNode, elementType: unknown): boolean {
  if (Array.isArray(node)) {
    return node.some((child) => containsElementType(child, elementType))
  }

  if (!isValidElement(node)) {
    return false
  }

  if (node.type === elementType) {
    return true
  }

  return containsElementType(node.props.children, elementType)
}

afterEach(() => {
  delete process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  vi.resetModules()
})

describe('App', () => {
  it('wraps the configured mobile app in QueryClientProvider', async () => {
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mobile'
    vi.resetModules()

    const [{ default: App }, { QueryClientProvider }] = await Promise.all([
      import('../App'),
      import('@tanstack/react-query'),
    ])

    expect(containsElementType(App(), QueryClientProvider)).toBe(true)
  })
})
