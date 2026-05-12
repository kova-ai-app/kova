import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  GetObjectCommand: vi.fn().mockImplementation((params) => ({ input: params })),
}))

import { S3Client } from '@aws-sdk/client-s3'
import { downloadChunks } from '../lib/s3.js'

function makeStream(...chunks: string[]): AsyncIterable<Uint8Array> {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const c of chunks) {
        yield Buffer.from(c)
      }
    },
  }
}

describe('downloadChunks', () => {
  let mockSend: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.S3_BUCKET_NAME = 'kova-audio-dev'
    process.env.AWS_REGION = 'us-east-1'
    process.env.AWS_ACCESS_KEY_ID = 'test'
    process.env.AWS_SECRET_ACCESS_KEY = 'test'

    // Each downloadChunks call creates a new S3Client — configure send on the constructor mock
    mockSend = vi.fn()
    ;(S3Client as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({ send: mockSend }))
  })

  it('downloads a single chunk and returns a Buffer', async () => {
    mockSend.mockResolvedValueOnce({ Body: makeStream('hello') })

    const buf = await downloadChunks(['audio/co-1/sess-1/chunk_0.aac'])
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.toString()).toBe('hello')
  })

  it('downloads multiple chunks and concatenates them in order', async () => {
    mockSend
      .mockResolvedValueOnce({ Body: makeStream('chunk0') })
      .mockResolvedValueOnce({ Body: makeStream('chunk1') })

    const buf = await downloadChunks([
      'audio/co-1/sess-1/chunk_0.aac',
      'audio/co-1/sess-1/chunk_1.aac',
    ])
    expect(buf.toString()).toBe('chunk0chunk1')
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('throws when S3 returns no Body', async () => {
    mockSend.mockResolvedValueOnce({ Body: null })
    await expect(
      downloadChunks(['audio/co-1/sess-1/chunk_0.aac'])
    ).rejects.toThrow('S3 object has no body')
  })
})
