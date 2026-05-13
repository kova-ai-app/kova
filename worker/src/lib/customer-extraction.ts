import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { groq } from '@ai-sdk/groq'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'
import type { TranscriptSegment } from '@kova/shared'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const CustomerInfoSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
})

export type ExtractedCustomerInfo = z.infer<typeof CustomerInfoSchema>

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You are analyzing a service call transcript between a technician and a customer.
Extract any customer information mentioned in the conversation.
Only include information that is explicitly stated — do not guess or infer.
If a piece of information is not mentioned, omit it from your response.

Respond with JSON ONLY:
{
  "name": "customer name if mentioned",
  "phone": "phone number if mentioned",
  "email": "email if mentioned",
  "address": "address if mentioned"
}`

// ---------------------------------------------------------------------------
// Provider factory (mirrors llm.ts)
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
// Transcript formatter
// ---------------------------------------------------------------------------

function formatForExtraction(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const role = s.speaker === 'speaker_0' ? 'Tech' : 'Customer'
      return `${role}: ${s.text}`
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// extractCustomerInfo
// ---------------------------------------------------------------------------

export async function extractCustomerInfo(
  segments: TranscriptSegment[],
): Promise<ExtractedCustomerInfo | null> {
  const provider = process.env.LLM_PROVIDER ?? 'openai'
  const model = process.env.LLM_MODEL ?? 'gpt-4o-mini'

  try {
    const result = await generateText({
      model: resolveModel(provider, model),
      system: EXTRACTION_PROMPT,
      prompt: formatForExtraction(segments),
      output: Output.object({ schema: CustomerInfoSchema }),
      temperature: 0,
    })

    const parsed = result.output
    if (!parsed.name && !parsed.phone && !parsed.email && !parsed.address) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
