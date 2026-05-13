import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { groq } from '@ai-sdk/groq'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'
import type { TranscriptSegment, JobType, Language, QualitativeDimension } from '@kova/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LLMQualScore {
  dimension: QualitativeDimension
  score: number    // 0–3
  reasoning: string
}

export interface LLMAnalysis {
  qualScores: LLMQualScore[]
  tokensIn: number
  tokensOut: number
  costUsd: number
  provider: string
  model: string
}

// ---------------------------------------------------------------------------
// Cost calculation (OpenAI rates as of 2025)
// ---------------------------------------------------------------------------

const OPENAI_RATES: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  'gpt-4o':      { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
}

// ---------------------------------------------------------------------------
// Response schema (Zod)
// ---------------------------------------------------------------------------

const QualDimSchema = z.object({
  score: z.number().min(0).max(3),
  reasoning: z.string(),
})

const LLMResponseSchema = z.object({
  diagnosis_quality:     QualDimSchema,
  hydrojet_presentation: QualDimSchema,
  customer_education:    QualDimSchema,
  close_quality:         QualDimSchema,
})

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a drain/plumbing service call quality evaluator.
Analyze the provided technician call transcript and score performance on exactly 4 dimensions (score 0–3 each):

- diagnosis_quality: Root cause explained in plain language; recurrence risk discussed with customer
- hydrojet_presentation: Hydrojetting or a permanent long-term solution was presented as an alternative to snaking
- customer_education: Time spent building trust and educating before presenting price; price not rushed within first 2 minutes
- close_quality: Multiple options (good/better/best) presented; objection handling present; confident close language used

Scoring guide: 0 = not done at all, 1 = attempted but incomplete, 2 = done well, 3 = excellent

Respond with JSON ONLY in this exact shape:
{
  "diagnosis_quality":     { "score": N, "reasoning": "one sentence" },
  "hydrojet_presentation": { "score": N, "reasoning": "one sentence" },
  "customer_education":    { "score": N, "reasoning": "one sentence" },
  "close_quality":         { "score": N, "reasoning": "one sentence" }
}`

// ---------------------------------------------------------------------------
// Transcript formatter
// ---------------------------------------------------------------------------

function formatTranscript(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const role = s.speaker === 'speaker_0' ? 'Tech' : 'Customer'
      const ts = `[${s.startSec.toFixed(0)}s]`
      return `${role} ${ts}: ${s.text}`
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

function resolveModel(providerId: string, modelId: string) {
  switch (providerId) {
    case 'openai':     return openai(modelId)
    case 'anthropic':  return anthropic(modelId)
    case 'google':     return google(modelId)
    case 'groq':       return groq(modelId)
    case 'openrouter': {
      const client = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
      return client.chat(modelId)
    }
    default:
      throw new Error(`Unknown LLM provider: ${providerId}`)
  }
}

// ---------------------------------------------------------------------------
// analyzeTranscript
// ---------------------------------------------------------------------------

/**
 * Analyze a call transcript using the configured LLM provider.
 * Provider and model are configured via LLM_PROVIDER and LLM_MODEL env vars.
 * Throws on API error — caller should catch and fall back to rules-only scoring.
 */
export async function analyzeTranscript(
  segments: TranscriptSegment[],
  jobType: JobType | null,
  language: Language,
): Promise<LLMAnalysis> {
  const provider = process.env.LLM_PROVIDER ?? 'openai'
  const model = process.env.LLM_MODEL ?? 'gpt-4o-mini'
  const aiModel = resolveModel(provider, model)

  const userContent = [
    `Job type: ${jobType ?? 'unknown'}`,
    `Call language: ${language}`,
    '',
    'TRANSCRIPT:',
    formatTranscript(segments),
  ].join('\n')

  const result = await generateObject({
    model: aiModel,
    system: SYSTEM_PROMPT,
    prompt: userContent,
    schema: LLMResponseSchema,
    temperature: 0,
  })

  const parsed = result.object
  const tokensIn = result.usage.inputTokens ?? 0
  const tokensOut = result.usage.outputTokens ?? 0

  const rates = OPENAI_RATES[model]
  const costUsd = provider === 'openai' && rates
    ? tokensIn * rates.input + tokensOut * rates.output
    : 0

  const qualScores: LLMQualScore[] = [
    { dimension: 'diagnosis_quality',     score: parsed.diagnosis_quality.score,     reasoning: parsed.diagnosis_quality.reasoning },
    { dimension: 'hydrojet_presentation', score: parsed.hydrojet_presentation.score, reasoning: parsed.hydrojet_presentation.reasoning },
    { dimension: 'customer_education',    score: parsed.customer_education.score,    reasoning: parsed.customer_education.reasoning },
    { dimension: 'close_quality',         score: parsed.close_quality.score,         reasoning: parsed.close_quality.reasoning },
  ]

  return { qualScores, tokensIn, tokensOut, costUsd, provider, model }
}
