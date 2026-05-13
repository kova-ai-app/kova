import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer'
import JobTaggingScreen from '../JobTaggingScreen'

type TextareaNode = { props: { onChangeText: (value: string) => void } }
type ButtonNode = { props: { onPress: () => Promise<void> | void } }

const setJobMetadata = vi.fn()
const setSessionStatus = vi.fn()
const triggerUpload = vi.fn().mockResolvedValue(undefined)
const setStatus = vi.fn()
const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined)
const reset = vi.fn()

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}))

vi.mock('../../stores/upload-queue', () => ({
  setJobMetadata: (...args: unknown[]) => setJobMetadata(...args),
  setSessionStatus: (...args: unknown[]) => setSessionStatus(...args),
}))

vi.mock('../../stores/recording-store', () => ({
  useRecordingStore: (selector: (state: { setStatus: typeof setStatus; reset: typeof reset }) => unknown) =>
    selector({ setStatus, reset }),
}))

vi.mock('../../services/upload-trigger', () => ({
  triggerUpload: (...args: unknown[]) => triggerUpload(...args),
}))

vi.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token-123') }),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  }
})

function createProps() {
  return {
    navigation: { navigate: vi.fn() },
    route: { params: { sessionId: 'session-1', callId: 'call-1' } },
  } as any
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('JobTaggingScreen', () => {
  it('starts upload immediately after saving metadata', async () => {
    const props = createProps()
    let renderer: ReactTestRenderer

    await act(async () => {
      renderer = TestRenderer.create(<JobTaggingScreen {...props} />)
    })

    const textarea = renderer!.root.findByProps({ placeholder: 'Any notes about this call...' }) as unknown as TextareaNode

    await act(async () => {
      textarea.props.onChangeText('  Needs camera scope cleanup  ')
    })

    const submitButton = renderer!.root.findAllByType('TouchableOpacity')[3] as unknown as ButtonNode

    await act(async () => {
      await submitButton.props.onPress()
    })

    expect(setJobMetadata).toHaveBeenCalledWith('session-1', {
      jobType: 'drain',
      notes: 'Needs camera scope cleanup',
    })
    expect(triggerUpload).toHaveBeenCalledOnce()
    expect(setSessionStatus).not.toHaveBeenCalled()
    expect(setStatus).toHaveBeenCalledWith('uploading')
    expect(reset).toHaveBeenCalledOnce()
    expect(triggerUpload.mock.invocationCallOrder[0]).toBeLessThan(reset.mock.invocationCallOrder[0])
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['calls'] })
    expect(props.navigation.navigate).toHaveBeenCalledWith('Main')
  })

  it('invalidates the calls query after submit so Home shows the new call', async () => {
    const props = createProps()
    let renderer: ReactTestRenderer

    await act(async () => {
      renderer = TestRenderer.create(<JobTaggingScreen {...props} />)
    })

    const submitButton = renderer!.root.findAllByType('TouchableOpacity')[3] as unknown as ButtonNode

    await act(async () => {
      await submitButton.props.onPress()
    })

    expect(triggerUpload).toHaveBeenCalledOnce()
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['calls'] })
    expect(props.navigation.navigate).toHaveBeenCalledWith('Main')
  })

  it('starts upload immediately when skipped', async () => {
    const props = createProps()
    let renderer: ReactTestRenderer

    await act(async () => {
      renderer = TestRenderer.create(<JobTaggingScreen {...props} />)
    })

    const skipButton = renderer!.root.findAllByType('TouchableOpacity')[4] as unknown as ButtonNode

    await act(async () => {
      await skipButton.props.onPress()
    })

    expect(setJobMetadata).not.toHaveBeenCalled()
    expect(triggerUpload).toHaveBeenCalledOnce()
    expect(setSessionStatus).not.toHaveBeenCalled()
    expect(setStatus).toHaveBeenCalledWith('uploading')
    expect(reset).toHaveBeenCalledOnce()
    expect(triggerUpload.mock.invocationCallOrder[0]).toBeLessThan(reset.mock.invocationCallOrder[0])
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['calls'] })
    expect(props.navigation.navigate).toHaveBeenCalledWith('Main')
  })
})
