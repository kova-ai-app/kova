import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@deepgram/sdk', () => ({
  createClient: vi.fn().mockReturnValue({
    listen: {
      prerecorded: {
        transcribeFile: vi.fn(),
      },
    },
  }),
}))

import { createClient } from '@deepgram/sdk'
import { transcribeAudio } from '../lib/deepgram.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUtterance(
  speaker: number,
  transcript: string,
  start: number,
  end: number,
  confidence = 0.95
) {
  return { id: `u-${start}`, speaker, transcript, start, end, confidence, words: [], channel: 0 }
}

function makeDeepgramResponse(
  utterances: ReturnType<typeof makeUtterance>[],
  detectedLanguage: string,
  duration: number,
  overallConfidence = 0.93
) {
  return {
    result: {
      metadata: { duration },
      results: {
        utterances,
        channels: [
          {
            detected_language: detectedLanguage,
            alternatives: [{ confidence: overallConfidence }],
          },
        ],
      },
    },
    error: null,
  }
}

function getTranscribeFile() {
  return mockTranscribeFile
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let mockTranscribeFile: ReturnType<typeof vi.fn>

describe('transcribeAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DEEPGRAM_API_KEY = 'test-key'
    // Create a stable transcribeFile mock and expose it for tests to configure
    mockTranscribeFile = vi.fn()
    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      listen: {
        prerecorded: {
          transcribeFile: mockTranscribeFile,
        },
      },
    })
  })

  // --- Scenario 1: EN single speaker, short call ---
  it('1. maps a single-speaker EN utterance to TranscriptSegment', async () => {
    getTranscribeFile().mockResolvedValueOnce(
      makeDeepgramResponse(
        [makeUtterance(0, 'Your drain is cleared.', 0, 4.5)],
        'en', 4.5
      )
    )
    const result = await transcribeAudio(Buffer.from('audio'), 'en')
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].speaker).toBe('speaker_0')
    expect(result.segments[0].text).toBe('Your drain is cleared.')
    expect(result.segments[0].startSec).toBe(0)
    expect(result.segments[0].endSec).toBe(4.5)
    expect(result.segments[0].language).toBe('en')
    expect(result.language).toBe('en')
  })

  // --- Scenario 2: EN two speakers, standard call ---
  it('2. maps two-speaker EN utterances preserving speaker order', async () => {
    getTranscribeFile().mockResolvedValueOnce(
      makeDeepgramResponse(
        [
          makeUtterance(0, 'Hello, I am here to service your drain.', 0, 3.2),
          makeUtterance(1, 'Great, the sink is backing up.', 3.5, 7.1),
          makeUtterance(0, 'I can clear it today and also offer a camera inspection.', 7.5, 12.0),
        ],
        'en', 12.0
      )
    )
    const result = await transcribeAudio(Buffer.from('audio'), 'en')
    expect(result.segments).toHaveLength(3)
    expect(result.segments[0].speaker).toBe('speaker_0')
    expect(result.segments[1].speaker).toBe('speaker_1')
    expect(result.segments[2].speaker).toBe('speaker_0')
  })

  // --- Scenario 3: EN with low confidence ---
  it('3. low-confidence EN transcript still produces valid result', async () => {
    getTranscribeFile().mockResolvedValueOnce(
      makeDeepgramResponse(
        [makeUtterance(0, 'Something unclear...', 0, 5.0, 0.42)],
        'en', 5.0, 0.42
      )
    )
    const result = await transcribeAudio(Buffer.from('audio'), 'en')
    expect(result.werConfidence).toBeCloseTo(0.42)
    expect(result.segments[0].confidence).toBeCloseTo(0.42)
  })

  // --- Scenario 4: EN multi-chunk call (longer duration) ---
  it('4. longer EN call produces correct cost calculation', async () => {
    getTranscribeFile().mockResolvedValueOnce(
      makeDeepgramResponse(
        [
          makeUtterance(0, 'Technician intro.', 0, 60),
          makeUtterance(1, 'Customer response.', 62, 120),
        ],
        'en', 1200 // 20 minutes
      )
    )
    const result = await transcribeAudio(Buffer.from('audio'), 'en')
    // 20 minutes × $0.0043 = $0.086
    expect(result.costUsd).toBeCloseTo(0.086, 3)
    expect(result.durationSec).toBe(1200)
  })

  // --- Scenario 5: EN empty utterances (very short / silence) ---
  it('5. empty utterances returns empty segments without throwing', async () => {
    getTranscribeFile().mockResolvedValueOnce(
      makeDeepgramResponse([], 'en', 2.0)
    )
    const result = await transcribeAudio(Buffer.from('audio'), 'en')
    expect(result.segments).toHaveLength(0)
    expect(result.language).toBe('en')
  })

  // --- Scenario 6: ES standard call, two speakers ---
  it('6. maps a two-speaker ES call with language detection', async () => {
    getTranscribeFile().mockResolvedValueOnce(
      makeDeepgramResponse(
        [
          makeUtterance(0, 'Buenos días, vengo a revisar el drenaje.', 0, 4.0),
          makeUtterance(1, 'Sí, el fregadero está tapado.', 4.5, 8.0),
        ],
        'es', 8.0
      )
    )
    const result = await transcribeAudio(Buffer.from('audio'), 'es')
    expect(result.language).toBe('es')
    expect(result.segments[0].language).toBe('es')
  })

  // --- Scenario 7: ES with English brand names (mostly ES) ---
  it('7. ES call with English brand names detected as ES', async () => {
    getTranscribeFile().mockResolvedValueOnce(
      makeDeepgramResponse(
        [makeUtterance(0, 'Usamos tecnología HydroJet para limpiar.', 0, 5.0)],
        'es', 5.0
      )
    )
    const result = await transcribeAudio(Buffer.from('audio'), 'es')
    expect(result.language).toBe('es')
  })

  // --- Scenario 8: ES multi-chunk call ---
  it('8. ES multi-chunk call cost is correct', async () => {
    getTranscribeFile().mockResolvedValueOnce(
      makeDeepgramResponse(
        [makeUtterance(0, 'Texto en español.', 0, 300)],
        'es', 300 // exactly 5 minutes
      )
    )
    const result = await transcribeAudio(Buffer.from('audio'), 'es')
    // 5 minutes × $0.0043 = $0.0215
    expect(result.costUsd).toBeCloseTo(0.0215, 4)
  })

  // --- Scenario 9: Bilingual EN→ES ---
  it('9. bilingual call detected as ES when Deepgram reports es', async () => {
    getTranscribeFile().mockResolvedValueOnce(
      makeDeepgramResponse(
        [
          makeUtterance(0, 'Hello, I am here to fix the drain.', 0, 3.0),
          makeUtterance(1, 'Bien, el drenaje está tapado.', 3.5, 7.0),
        ],
        'es', 7.0 // Deepgram reports es as dominant
      )
    )
    const result = await transcribeAudio(Buffer.from('audio'), 'es')
    expect(result.language).toBe('es')
  })

  // --- Scenario 10: Bilingual ES→EN ---
  it('10. bilingual call detected as en when Deepgram reports en', async () => {
    getTranscribeFile().mockResolvedValueOnce(
      makeDeepgramResponse(
        [
          makeUtterance(0, 'Hola, vengo a revisar.', 0, 2.5),
          makeUtterance(1, 'Please check the bathroom drain too.', 3.0, 7.0),
        ],
        'en', 7.0
      )
    )
    const result = await transcribeAudio(Buffer.from('audio'), 'en')
    expect(result.language).toBe('en')
  })

  // --- Error handling ---
  it('throws if Deepgram returns an error', async () => {
    getTranscribeFile().mockResolvedValueOnce({
      result: null,
      error: { message: 'Invalid API key', status: 401 },
    })
    await expect(transcribeAudio(Buffer.from('audio'), 'en')).rejects.toThrow(
      'Deepgram transcription failed'
    )
  })
})
