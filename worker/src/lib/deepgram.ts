import { createClient } from '@deepgram/sdk'
import type { Language, TranscriptSegment } from '@kova/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscriptionResult {
  segments: TranscriptSegment[]
  language: Language
  werConfidence: number
  durationSec: number
  costUsd: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEEPGRAM_COST_PER_MIN = 0.0058

const DRAIN_PLUMBING_KEYTERMS = [
  'drain cleaning',
  'hydro jetting',
  'camera inspection',
  'grease trap',
  'preventive maintenance plan',
  'pipe repair',
  'pipe liner',
  'water heater',
  'fixture upgrade',
  'water filtration',
  'pressure regulator',
  'whole home repiping',
]

// ---------------------------------------------------------------------------
// Language normalisation
// ---------------------------------------------------------------------------

function toLanguage(detected: string | undefined): Language {
  if (detected === 'en') return 'en'
  if (detected === 'es') return 'es'
  return 'unknown'
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Transcribe a concatenated AAC-LC audio buffer via Deepgram Nova-3 Multilingual.
 *
 * @param audioBuffer  Concatenated audio bytes (all chunks for the call)
 * @param hintLanguage Optional hint from the call record ('en' | 'es' | 'unknown')
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  hintLanguage: Language
): Promise<TranscriptionResult> {
  const client = createClient(process.env.DEEPGRAM_API_KEY!)

  const { result, error } = await client.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: 'nova-3',
      language: 'multi',
      smart_format: true,
      diarize: true,
      utterances: true,
      keyterms: DRAIN_PLUMBING_KEYTERMS,
    }
  )

  if (error || !result) {
    throw new Error(`Deepgram transcription failed: ${error?.message ?? 'unknown error'}`)
  }

  const utterances = result.results?.utterances ?? []
  const channel = result.results?.channels?.[0]
  const detectedLanguage = toLanguage(channel?.detected_language)
  const werConfidence = channel?.alternatives?.[0]?.confidence ?? 0
  const durationSec = result.metadata?.duration ?? 0

  // Suppress unused variable warning for hintLanguage (used as fallback in future)
  void hintLanguage

  // Map Deepgram utterances → TranscriptSegment[]
  const segments: TranscriptSegment[] = utterances.map((u) => ({
    speaker: `speaker_${u.speaker}`,
    text: u.transcript,
    startSec: u.start,
    endSec: u.end,
    language: detectedLanguage,
    confidence: u.confidence,
  }))

  // Cost: $0.0043/min, rounded up to nearest minute
  const minutes = Math.ceil(durationSec / 60)
  const costUsd = minutes * DEEPGRAM_COST_PER_MIN

  return {
    segments,
    language: detectedLanguage,
    werConfidence,
    durationSec,
    costUsd,
  }
}
