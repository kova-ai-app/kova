import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer'
import RecordScreen from '../RecordScreen'

const mockUseRecordingStore = vi.fn()
const mockUseAuth = vi.fn()
const mockUseOrganization = vi.fn()
const navigateMock = vi.fn()

vi.mock('../../stores/recording-store', () => ({
  useRecordingStore: () => mockUseRecordingStore(),
}))

vi.mock('@clerk/clerk-expo', () => ({
  useAuth: () => mockUseAuth(),
  useOrganization: () => mockUseOrganization(),
}))

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: navigateMock }),
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: Record<string, unknown>) => React.createElement('Ionicons', props),
}))

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}))

vi.mock('react-native-device-info', () => ({
  default: {
    getBatteryLevel: vi.fn().mockResolvedValue(0.8),
  },
}))

vi.mock('../../components/ConsentModal', () => ({
  default: () => null,
}))

function createRecordingState(overrides: Record<string, unknown> = {}) {
  return {
    status: 'idle',
    elapsedSec: 0,
    chunkCount: 0,
    batteryLevel: null,
    error: null,
    startRecording: vi.fn().mockResolvedValue(undefined),
    consentGranted: vi.fn().mockResolvedValue(undefined),
    consentDeclined: vi.fn().mockResolvedValue(undefined),
    pauseRecording: vi.fn().mockResolvedValue(undefined),
    resumeRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue(undefined),
    setBatteryLevel: vi.fn(),
    incrementElapsed: vi.fn(),
    ...overrides,
  }
}

function renderScreen() {
  let renderer: ReactTestRenderer
  act(() => {
    renderer = TestRenderer.create(<RecordScreen />)
  })
  return renderer!
}

function getTextValues(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text')
    .map((node) => node.props.children)
    .map((children) => Array.isArray(children) ? children.join('') : String(children))
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('RecordScreen controls', () => {
  it('renders a mic icon instead of start text when idle', () => {
    mockUseAuth.mockReturnValue({ userId: 'user-1' })
    mockUseOrganization.mockReturnValue({ organization: { id: 'org-1' } })
    mockUseRecordingStore.mockReturnValue(createRecordingState())

    const renderer = renderScreen()

    expect(renderer.root.findByProps({ accessibilityLabel: 'Open settings' })).toBeTruthy()
    expect(renderer.root.findByProps({ accessibilityLabel: 'Start recording' })).toBeTruthy()
    expect(() => renderer.root.findByProps({ children: 'Start Recording' })).toThrow()
  })

  it('keeps the settings button available while idle', () => {
    mockUseAuth.mockReturnValue({ userId: 'user-1' })
    mockUseOrganization.mockReturnValue({ organization: { id: 'org-1' } })
    mockUseRecordingStore.mockReturnValue(createRecordingState())

    const renderer = renderScreen()

    expect(renderer.root.findByProps({ accessibilityLabel: 'Open settings' })).toBeTruthy()
    expect(renderer.root.findByProps({ accessibilityLabel: 'Start recording' })).toBeTruthy()
  })

  it('shows the start recording button again after handoff enters uploading', () => {
    mockUseAuth.mockReturnValue({ userId: 'user-1' })
    mockUseOrganization.mockReturnValue({ organization: { id: 'org-1' } })
    mockUseRecordingStore.mockReturnValue(
      createRecordingState({ status: 'uploading', elapsedSec: 42, chunkCount: 1 })
    )

    const renderer = renderScreen()

    expect(renderer.root.findByProps({ accessibilityLabel: 'Start recording' })).toBeTruthy()
    expect(() => renderer.root.findByProps({ accessibilityLabel: 'Stop recording' })).toThrow()
  })

  it('renders icon-only pause and stop controls while active', () => {
    mockUseAuth.mockReturnValue({ userId: 'user-1' })
    mockUseOrganization.mockReturnValue({ organization: { id: 'org-1' } })
    mockUseRecordingStore.mockReturnValue(
      createRecordingState({ status: 'recording', elapsedSec: 42, chunkCount: 1 })
    )

    const renderer = renderScreen()

    expect(renderer.root.findByProps({ accessibilityLabel: 'Open settings' })).toBeTruthy()
    expect(renderer.root.findByProps({ accessibilityLabel: 'Pause recording' })).toBeTruthy()
    expect(renderer.root.findByProps({ accessibilityLabel: 'Stop recording' })).toBeTruthy()
    expect(() => renderer.root.findByProps({ children: 'Pause' })).toThrow()
    expect(() => renderer.root.findByProps({ children: 'Stop' })).toThrow()
  })

  it('keeps the settings button available while recording', () => {
    mockUseAuth.mockReturnValue({ userId: 'user-1' })
    mockUseOrganization.mockReturnValue({ organization: { id: 'org-1' } })
    mockUseRecordingStore.mockReturnValue(
      createRecordingState({ status: 'recording', elapsedSec: 42, chunkCount: 1 })
    )

    const renderer = renderScreen()

    expect(renderer.root.findByProps({ accessibilityLabel: 'Open settings' })).toBeTruthy()
    expect(renderer.root.findByProps({ accessibilityLabel: 'Pause recording' })).toBeTruthy()
    expect(renderer.root.findByProps({ accessibilityLabel: 'Stop recording' })).toBeTruthy()
  })

  it('renders battery warning text without emoji', () => {
    mockUseAuth.mockReturnValue({ userId: 'user-1' })
    mockUseOrganization.mockReturnValue({ organization: { id: 'org-1' } })
    mockUseRecordingStore.mockReturnValue(
      createRecordingState({ status: 'recording', batteryLevel: 15 })
    )

    const renderer = renderScreen()
    const textValues = getTextValues(renderer)

    expect(textValues).toContain('Battery at 15%')
    expect(textValues).not.toContain('⚠️ Battery at 15%')
  })
})
