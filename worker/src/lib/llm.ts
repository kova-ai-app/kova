import OpenAI from 'openai'
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
}

// ---------------------------------------------------------------------------
// Cost calculation (GPT-4o-mini rates as of 2025)
// ---------------------------------------------------------------------------

const GPT4O_MINI_INPUT_COST_PER_TOKEN = 0.15 / 1_000_000   // $0.15 / 1M tokens
const GPT4O_MINI_OUTPUT_COST_PER_TOKEN = 0.60 / 1_000_000  // $0.60 / 1M tokens

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
// analyzeTranscript
// ---------------------------------------------------------------------------

/**
 * Call GPT-4o-mini to score 4 qualitative drain/plumbing call dimensions.
 * Throws on API error — caller should catch and fall back to rules-only scoring.
 */
export async function analyzeTranscript(
  segments: TranscriptSegment[],
  jobType: JobType | null,
  language: Language,
): Promise<LLMAnalysis> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const userContent = [
    `Job type: ${jobType ?? 'unknown'}`,
    `Call language: ${language}`,
    '',
    'TRANSCRIPT:',
    formatTranscript(segments),
  ].join('\n')

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = LLMResponseSchema.parse(JSON.parse(raw))

  const tokensIn = response.usage?.prompt_tokens ?? 0
  const tokensOut = response.usage?.completion_tokens ?? 0
  const costUsd =
    tokensIn * GPT4O_MINI_INPUT_COST_PER_TOKEN +
    tokensOut * GPT4O_MINI_OUTPUT_COST_PER_TOKEN

  const qualScores: LLMQualScore[] = [
    { dimension: 'diagnosis_quality',     score: parsed.diagnosis_quality.score,     reasoning: parsed.diagnosis_quality.reasoning },
    { dimension: 'hydrojet_presentation', score: parsed.hydrojet_presentation.score, reasoning: parsed.hydrojet_presentation.reasoning },
    { dimension: 'customer_education',    score: parsed.customer_education.score,    reasoning: parsed.customer_education.reasoning },
    { dimension: 'close_quality',         score: parsed.close_quality.score,         reasoning: parsed.close_quality.reasoning },
  ]

  return { qualScores, tokensIn, tokensOut, costUsd }
}
