import React from 'react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'

const mockUseUser = vi.fn()
const mockUseOrganization = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('@clerk/clerk-expo', () => ({
  useUser: () => mockUseUser(),
  useOrganization: () => mockUseOrganization(),
  useAuth: () => mockUseAuth(),
}))

function getTextValues(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text')
    .map((node: ReactTestInstance) => (node.props as { children?: ReactNode }).children)
    .map((children: ReactNode | undefined) => Array.isArray(children) ? children.join('') : String(children))
}

afterEach(() => {
  delete process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  vi.clearAllMocks()
  vi.resetModules()
})

describe('SettingsScreen', () => {
  it('renders the settings title and profile section for signed-in users', async () => {
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mobile'
    mockUseUser.mockReturnValue({
      isLoaded: true,
      user: {
        fullName: 'Ada Lovelace',
        firstName: 'Ada',
        primaryPhoneNumber: { phoneNumber: '+1 555 0100' },
      },
    })
    mockUseOrganization.mockReturnValue({
      isLoaded: true,
      organization: { name: 'Drain Right' },
    })
    mockUseAuth.mockReturnValue({ signOut: vi.fn() })

    const { default: SettingsScreen } = await import('../SettingsScreen')

    let renderer!: ReactTestRenderer
    act(() => {
      renderer = TestRenderer.create(<SettingsScreen />)
    })
    const textValues = getTextValues(renderer)

    expect(textValues).toEqual(expect.arrayContaining([
      'Settings',
      'Profile',
      'Ada Lovelace',
      '+1 555 0100',
      'Drain Right',
      'Sign Out',
    ]))
  })

  it('renders the placeholder when Clerk is not configured', async () => {
    const { default: SettingsScreen } = await import('../SettingsScreen')

    let renderer!: ReactTestRenderer
    act(() => {
      renderer = TestRenderer.create(<SettingsScreen />)
    })

    expect(getTextValues(renderer)).toEqual(expect.arrayContaining([
      'Settings',
      'Profile',
      'Clerk is not configured.',
    ]))
  })
})
