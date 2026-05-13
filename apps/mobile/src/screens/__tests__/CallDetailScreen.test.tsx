import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer'
import CallDetailScreen from '../CallDetailScreen'

const mockGetToken = vi.fn().mockResolvedValue('token-123')
const mockFetchCall = vi.fn()
const mockFetchCallAudioUrl = vi.fn()
const mockDisputeOpportunity = vi.fn()
const mockInvalidateQueries = vi.fn()
const mockSetAudioModeAsync = vi.fn().mockResolvedValue(undefined)
const mockPauseAsync = vi.fn().mockResolvedValue(undefined)
const mockPlayAsync = vi.fn().mockResolvedValue(undefined)
const mockReplayAsync = vi.fn().mockResolvedValue(undefined)
const mockSetPositionAsync = vi.fn().mockResolvedValue(undefined)
const mockUnloadAsync = vi.fn().mockResolvedValue(undefined)
let playbackStatusUpdate: ((status: any) => void) | undefined
let currentCallDetailData: any

vi.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn }: { queryFn: () => Promise<unknown> }) => {
    const [data, setData] = React.useState<any>()
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
      let mounted = true
      void queryFn().then((result) => {
        if (!mounted) return
        setData(result)
        setIsLoading(false)
      })
      return () => {
        mounted = false
      }
    }, [queryFn])

    return { data, isLoading, isError: false, refetch: vi.fn() }
  },
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))

vi.mock('../../services/api', () => ({
  fetchCall: (...args: unknown[]) => mockFetchCall(...args),
  fetchCallAudioUrl: (...args: unknown[]) => mockFetchCallAudioUrl(...args),
  disputeOpportunity: (...args: unknown[]) => mockDisputeOpportunity(...args),
}))

vi.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
    Sound: {
      createAsync: vi.fn().mockImplementation(
        async (_source: unknown, _status: unknown, onStatusUpdate: (status: any) => void) => {
          playbackStatusUpdate = onStatusUpdate
          return {
            sound: {
              pauseAsync: mockPauseAsync,
              playAsync: mockPlayAsync,
              replayAsync: mockReplayAsync,
              setPositionAsync: mockSetPositionAsync,
              unloadAsync: mockUnloadAsync,
            },
          }
        }
      ),
    },
  },
}))

function createProps() {
  return {
    route: { params: { callId: 'call-1' } },
    navigation: { navigate: vi.fn() },
  } as any
}

function createCallDetailData(overrides?: Partial<any>) {
  return {
    call: {
      id: 'call-1',
      recordedAt: '2026-05-12T10:00:00.000Z',
      durationSec: 120,
      status: 'scored',
      jobType: 'drain',
      s3Key: 'audio/key.aac',
      ...overrides?.call,
    },
    score: null,
    opportunities: [],
    feedback: [],
    transcript: null,
    ...overrides,
  }
}

type TestTextNode = { props: { children: unknown } }
type TestTouchableNode = { findAllByType: (type: string) => TestTextNode[]; props: { onPress: () => Promise<void> | void } }

async function renderScreen() {
  let renderer: ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<CallDetailScreen {...createProps()} />)
  })
  await act(async () => {
    await Promise.resolve()
  })
  return renderer!
}

beforeEach(() => {
  vi.clearAllMocks()
  playbackStatusUpdate = undefined
  currentCallDetailData = createCallDetailData()
  mockFetchCall.mockImplementation(() => Promise.resolve(currentCallDetailData))
  mockFetchCallAudioUrl.mockResolvedValue({ url: 'https://signed.example/audio.aac' })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('CallDetailScreen audio playback', () => {
  it('switches to playback mode before loading call audio', async () => {
    const renderer = await renderScreen()

    const playButton = (renderer.root.findAllByType('TouchableOpacity') as unknown as TestTouchableNode[]).find(
      (node) => node.findAllByType('Text').some((textNode: TestTextNode) => textNode.props.children === '▶  Play Recording')
    )

    await act(async () => {
      await playButton!.props.onPress()
    })

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    })
    expect(mockFetchCallAudioUrl).toHaveBeenCalledWith('token-123', 'call-1')
  })

  it('replays from the beginning after playback finishes', async () => {
    const renderer = await renderScreen()

    const initialPlayButton = (renderer.root.findAllByType('TouchableOpacity') as unknown as TestTouchableNode[]).find(
      (node) => node.findAllByType('Text').some((textNode: TestTextNode) => textNode.props.children === '▶  Play Recording')
    )

    await act(async () => {
      await initialPlayButton!.props.onPress()
    })

    await act(async () => {
      playbackStatusUpdate?.({
        isLoaded: true,
        positionMillis: 1200,
        durationMillis: 1200,
        isPlaying: false,
        didJustFinish: true,
      })
    })

    const replayButton = (renderer.root.findAllByType('TouchableOpacity') as unknown as TestTouchableNode[]).find(
      (node) => node.findAllByType('Text').some((textNode: TestTextNode) => textNode.props.children === '▶  Play Recording')
    )

    await act(async () => {
      await replayButton!.props.onPress()
    })

    expect(mockReplayAsync).toHaveBeenCalledOnce()
    expect(mockPlayAsync).not.toHaveBeenCalled()
    expect(mockSetPositionAsync).toHaveBeenCalledWith(0)
  })
})

describe('CallDetailScreen processing states', () => {
  it('shows queued messaging while a call is pending processing', async () => {
    currentCallDetailData = createCallDetailData({
      call: { status: 'pending' },
    })

    const renderer = await renderScreen()

    expect(() => renderer.root.findByProps({ children: 'Queued for processing' })).not.toThrow()
    expect(() =>
      renderer.root.findByProps({ children: 'This call is waiting to be transcribed and scored.' })
    ).not.toThrow()
  })

  it('shows active processing messaging while audio is being analyzed', async () => {
    currentCallDetailData = createCallDetailData({
      call: { status: 'processing' },
    })

    const renderer = await renderScreen()

    expect(() => renderer.root.findByProps({ children: 'Processing audio' })).not.toThrow()
    expect(() =>
      renderer.root.findByProps({ children: 'Transcript and score are still being generated.' })
    ).not.toThrow()
  })

  it('shows transcript plus a failure notice when processing failed after transcription', async () => {
    currentCallDetailData = createCallDetailData({
      call: { status: 'failed' },
      transcript: {
        segments: [{ speaker: 1, text: 'Customer explained the issue.', start: 0 }],
      },
    })

    const renderer = await renderScreen()

    expect(() => renderer.root.findByProps({ children: 'Processing failed' })).not.toThrow()
    expect(() =>
      renderer.root.findByProps({ children: 'Transcript is available, but scoring did not complete.' })
    ).not.toThrow()
    expect(() => renderer.root.findByProps({ children: 'Transcript' })).not.toThrow()
    expect(() => renderer.root.findByProps({ children: 'Customer explained the issue.' })).not.toThrow()
  })

  it('shows a failure message when processing fails without a transcript', async () => {
    currentCallDetailData = createCallDetailData({
      call: { status: 'failed' },
      transcript: null,
    })

    const renderer = await renderScreen()

    expect(() => renderer.root.findByProps({ children: 'Processing failed' })).not.toThrow()
    expect(() =>
      renderer.root.findByProps({ children: 'We could not generate a transcript or score for this call.' })
    ).not.toThrow()
    expect(renderer.root.findAllByProps({ children: 'Transcript' })).toHaveLength(0)
  })

  it('renders the transcript when available before scoring finishes', async () => {
    currentCallDetailData = createCallDetailData({
      call: { status: 'processing' },
      transcript: {
        segments: [{ speaker: 2, text: 'We can still review this transcript.', start: 3 }],
      },
    })

    const renderer = await renderScreen()

    expect(() => renderer.root.findByProps({ children: 'Transcript' })).not.toThrow()
    expect(() => renderer.root.findByProps({ children: 'We can still review this transcript.' })).not.toThrow()
    expect(() => renderer.root.findByProps({ children: 'Processing audio' })).not.toThrow()
  })
})
