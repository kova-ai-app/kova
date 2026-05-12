import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TranscriptSegment } from '@kova/shared'

vi.mock('openai', () => ({
  default: vi.fn(),
}))

import OpenAI from 'openai'
import { analyzeTranscript } from '../lib/llm.js'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

const VALID_LLM_JSON = JSON.stringify({
  diagnosis_quality:     { score: 2, reasoning: 'Root cause explained' },
  hydrojet_presentation: { score: 1, reasoning: 'Only snaking mentioned' },
  customer_education:    { score: 3, reasoning: 'Spent time educating' },
  close_quality:         { score: 2, reasoning: 'Two options presented' },
})

const MOCK_OPENAI_RESPONSE = {
  choices: [{ message: { content: VALID_LLM_JSON } }],
  usage: { prompt_tokens: 800, completion_tokens: 200 },
}

let mockCreate: ReturnType<typeof vi.fn>

describe('analyzeTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate = vi.fn()
    mockCreate.mockResolvedValue(MOCK_OPENAI_RESPONSE)
    ;(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }))
  })

  it('1. returns 4 qualitative dimension scores from a valid LLM response', async () => {
    const segs = [
      seg('speaker_0', 'Your drain has a root-cause buildup issue'),
      seg('speaker_1', 'What do we do?'),
      seg('speaker_0', 'Let me explain your options'),
    ]
    const result = await analyzeTranscript(segs, 'drain', 'en')
    expect(result.qualScores).toHaveLength(4)
    const diag = result.qualScores.find((q) => q.dimension === 'diagnosis_quality')
    expect(diag?.score).toBe(2)
    expect(diag?.reasoning).toBe('Root cause explained')
  })

  it('2. all 4 required dimensions are present in the result', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    const dims = result.qualScores.map((q) => q.dimension)
    expect(dims).toContain('diagnosis_quality')
    expect(dims).toContain('hydrojet_presentation')
    expect(dims).toContain('customer_education')
    expect(dims).toContain('close_quality')
  })

  it('3. returns tokensIn, tokensOut, and costUsd', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    expect(result.tokensIn).toBe(800)
    expect(result.tokensOut).toBe(200)
    expect(result.costUsd).toBeGreaterThan(0)
  })

  it('4. works for plumbing job type', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'plumbing', 'en')
    expect(result.qualScores).toHaveLength(4)
  })

  it('5. works for Spanish language calls', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hola')], 'drain', 'es')
    expect(result.qualScores).toHaveLength(4)
  })

  it('6. throws when OpenAI API call fails', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI API error: invalid key'))
    await expect(
      analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    ).rejects.toThrow('OpenAI API error')
  })
})
