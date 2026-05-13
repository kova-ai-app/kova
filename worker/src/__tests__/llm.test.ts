import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TranscriptSegment } from '@kova/shared'

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn().mockReturnValue('__output_object__'),
  },
}))

vi.mock('@ai-sdk/openai', () => ({ openai: vi.fn().mockReturnValue('__openai_model__') }))
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: vi.fn().mockReturnValue('__anthropic_model__') }))
vi.mock('@ai-sdk/google', () => ({ google: vi.fn().mockReturnValue('__google_model__') }))
vi.mock('@ai-sdk/groq', () => ({ groq: vi.fn().mockReturnValue('__groq_model__') }))
vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn().mockReturnValue({
    chat: vi.fn().mockReturnValue('__openrouter_model__'),
  }),
}))

import { generateText } from 'ai'
import { analyzeTranscript } from '../lib/llm.js'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

const VALID_OUTPUT = {
  diagnosis_quality:     { score: 2, reasoning: 'Root cause explained' },
  hydrojet_presentation: { score: 1, reasoning: 'Only snaking mentioned' },
  customer_education:    { score: 3, reasoning: 'Spent time educating' },
  close_quality:         { score: 2, reasoning: 'Two options presented' },
}

const MOCK_RESULT = {
  output: VALID_OUTPUT,
  usage: { inputTokens: 800, outputTokens: 200 },
}

describe('analyzeTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LLM_PROVIDER = 'openai'
    process.env.LLM_MODEL = 'gpt-4o-mini'
    ;(generateText as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_RESULT)
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

  it('4. returns provider and model fields', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    expect(result.provider).toBe('openai')
    expect(result.model).toBe('gpt-4o-mini')
  })

  it('5. works for plumbing job type', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'plumbing', 'en')
    expect(result.qualScores).toHaveLength(4)
  })

  it('6. works for Spanish language calls', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hola')], 'drain', 'es')
    expect(result.qualScores).toHaveLength(4)
  })

  it('7. throws when generateText fails', async () => {
    ;(generateText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error: invalid key'))
    await expect(
      analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    ).rejects.toThrow('API error')
  })

  it('8. non-OpenAI provider returns costUsd=0', async () => {
    process.env.LLM_PROVIDER = 'anthropic'
    process.env.LLM_MODEL = 'claude-3-haiku-20240307'
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    expect(result.costUsd).toBe(0)
    expect(result.provider).toBe('anthropic')
  })

  it('9. openrouter provider sets correct provider and model fields', async () => {
    process.env.LLM_PROVIDER = 'openrouter'
    process.env.LLM_MODEL = 'openai/gpt-4o-mini'
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    expect(result.provider).toBe('openrouter')
    expect(result.model).toBe('openai/gpt-4o-mini')
    expect(result.costUsd).toBe(0)
  })

  it('10. unknown provider throws', async () => {
    process.env.LLM_PROVIDER = 'fakeprovider'
    await expect(
      analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    ).rejects.toThrow('Unknown LLM provider')
  })

  it('11. defaults to openai/gpt-4o-mini when env vars not set', async () => {
    delete process.env.LLM_PROVIDER
    delete process.env.LLM_MODEL
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    expect(result.provider).toBe('openai')
    expect(result.model).toBe('gpt-4o-mini')
  })
})
