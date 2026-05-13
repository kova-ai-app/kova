import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunUploadManager = vi.fn()

vi.mock('../upload-manager', () => ({
  runUploadManager: mockRunUploadManager,
}))

describe('triggerUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000'
  })

  it('runs the upload manager immediately when a token is available', async () => {
    mockRunUploadManager.mockResolvedValue(undefined)
    const getToken = vi.fn().mockResolvedValue('token-123')

    const { triggerUpload } = await import('../upload-trigger')

    await triggerUpload(getToken)

    expect(getToken).toHaveBeenCalledOnce()
    expect(mockRunUploadManager).toHaveBeenCalledWith({
      apiBaseUrl: 'http://localhost:3000',
      authToken: 'token-123',
    })
  })

  it('does nothing when no auth token is available', async () => {
    const getToken = vi.fn().mockResolvedValue(null)

    const { triggerUpload } = await import('../upload-trigger')

    await triggerUpload(getToken)

    expect(mockRunUploadManager).not.toHaveBeenCalled()
  })

  it('reuses the in-flight upload run instead of starting a second one', async () => {
    let resolveToken!: (token: string) => void
    let resolveRun!: () => void
    mockRunUploadManager.mockImplementation(
      () => new Promise<void>((resolve) => { resolveRun = resolve })
    )
    const getToken = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => { resolveToken = resolve })
    )

    const { triggerUpload } = await import('../upload-trigger')

    const first = triggerUpload(getToken)
    const second = triggerUpload(getToken)

    expect(getToken).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)

    resolveToken('token-123')
    await Promise.resolve()

    expect(mockRunUploadManager).toHaveBeenCalledTimes(1)

    resolveRun()
    await Promise.all([first, second])
  })
})
