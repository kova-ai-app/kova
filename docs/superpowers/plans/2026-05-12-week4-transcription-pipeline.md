# Week 4 — Transcription Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uploaded audio is transcribed by Deepgram Nova-3 Multilingual within 5 minutes; diarized transcripts stored in Neon; processing costs recorded; Bull Board UI exposed on port 3001.

**Architecture:** The BullMQ scoring worker receives a job with `callId` + `s3Keys`. It downloads all AAC-LC chunks from S3, concatenates the buffers, sends a single Deepgram pre-recorded request with diarization and keyterm prompting, maps speaker utterances to `TranscriptSegment[]`, writes `transcripts` + `processing_costs` records to Neon, and advances call status `pending → processing → transcribed`. A sibling Express server on port 3001 serves the Bull Board dashboard for job monitoring on Railway.

**Tech Stack:** BullMQ 5, `@deepgram/sdk` 3 (already installed), `@aws-sdk/client-s3` 3 (already installed), Drizzle ORM, `@bull-board/api` 5, `@bull-board/express` 5, Express 4, Vitest 2

---

## Key Context (read before any task)

- `worker/` is a Node.js ESM package (`"type": "module"`). All imports use `.js` extensions.
- Vitest pattern (same as `apps/web`): `vi.mock()` calls before imports; ESM top-level imports after; cast mocks in `beforeEach` with `as unknown as ReturnType<typeof vi.fn>`.
- `@kova/db` is mocked in tests with a factory; real DB is never called in unit tests.
- Deepgram Nova-3 Multilingual + `utterances: true` returns `result.results.utterances[]` — use these directly as `TranscriptSegment[]` sources.
- S3 key pattern: `audio/{companyId}/{sessionId}/chunk_{N}.aac`. The `s3Keys` array in the job payload contains all keys in order.
- Deepgram cost: `$0.0043 / minute`, rounded up to nearest minute.
- `DEEPGRAM_API_KEY` and `S3_BUCKET_NAME` come from env; stubs already in CI `env:` block.
- `pino-pretty` must be installed for the dev logger transport (`logger.ts` line 7).

---

## File Map

```
packages/shared/src/schemas.ts          MODIFY  — simplify ScoringJobPayloadSchema (remove companyId/techId/language; add s3Keys)
apps/web/src/app/api/calls/upload-complete/route.ts   MODIFY  — send full job payload (s3Keys, totalDurationSec, jobType)
apps/web/src/app/api/calls/__tests__/upload-complete.test.ts  MODIFY  — update mock request body to include audioChannels:1
worker/package.json                     MODIFY  — add vitest, pino-pretty, @bull-board/api, @bull-board/express, express, @types/express
worker/vitest.config.ts                 CREATE  — test configuration
worker/src/lib/s3.ts                    CREATE  — S3 chunk downloader
worker/src/__tests__/s3.test.ts         CREATE  — tests for S3 downloader
worker/src/lib/deepgram.ts              CREATE  — Deepgram transcription + segment mapping
worker/src/__tests__/deepgram.test.ts   CREATE  — 10 synthetic transcript scenarios
worker/src/workers/scoring.ts           MODIFY  — implement transcription pipeline (Steps 1–4)
worker/src/__tests__/scoring.test.ts    CREATE  — scoring worker integration test
worker/src/lib/bull-board.ts            CREATE  — Bull Board Express server
worker/src/index.ts                     MODIFY  — start Bull Board HTTP server
```

---

## Task 1: Fix ScoringJobPayloadSchema and upload-complete Job Payload

The current `ScoringJobPayloadSchema` requires `companyId`, `techId`, and `language` — but the upload-complete route only sends `{ callId }`. This would cause `ScoringJobPayloadSchema.parse()` to throw on every real job. This task fixes the mismatch so the worker can actually process jobs in Week 4.

**Files:**
- Modify: `packages/shared/src/schemas.ts`
- Modify: `apps/web/src/app/api/calls/upload-complete/route.ts`
- Modify: `apps/web/src/app/api/calls/__tests__/upload-complete.test.ts`

- [ ] **Step 1: Update ScoringJobPayloadSchema**

In `packages/shared/src/schemas.ts`, replace the existing `ScoringJobPayloadSchema` and its `ScoringJobPayload` type:

```typescript
// ---- Worker Job Payload Schema ----------------------------------------------

export const ScoringJobPayloadSchema = z.object({
  callId: z.string(),
  s3Keys: z.array(z.string()).min(1),
  totalDurationSec: z.number().positive(),
  jobType: JobTypeSchema.optional(),
  promptVersion: z.string().default('v1'),
})

export type ScoringJobPayload = z.infer<typeof ScoringJobPayloadSchema>
```

(Remove `companyId`, `techId`, and `language` — the worker will fetch what it needs from DB in Week 6 when scoring requires company context.)

- [ ] **Step 2: Update upload-complete route to send full job payload**

In `apps/web/src/app/api/calls/upload-complete/route.ts`, replace the `getScoringQueue().add(...)` call:

```typescript
  // Enqueue scoring job
  await getScoringQueue().add(
    JOB_NAMES.SCORE_CALL,
    {
      callId: body.callId,
      s3Keys: body.s3Keys,
      totalDurationSec: body.totalDurationSec,
      jobType: body.jobMetadata?.jobType,
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  )
```

- [ ] **Step 3: Update upload-complete test request body**

In `apps/web/src/app/api/calls/__tests__/upload-complete.test.ts`, the `makeRequest` body is currently missing `audioChannels: 1` (required by the `UploadCompleteRequestSchema` in shared — not enforced in the route but good hygiene):

No change needed to the test file — the existing test still passes because the route doesn't validate the full schema. Run tests to confirm:

```bash
pnpm --filter @kova/web test
```

Expected: 6 tests PASS (same as before)

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: `Tasks: 5 successful, 5 total`

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas.ts \
        apps/web/src/app/api/calls/upload-complete/route.ts
git commit -m "fix: align ScoringJobPayload schema with upload-complete route — add s3Keys, remove unused fields"
```

---

## Task 2: Add Worker Dev Dependencies and Vitest Config

**Files:**
- Modify: `worker/package.json`
- Create: `worker/vitest.config.ts`

- [ ] **Step 1: Add dependencies**

```bash
pnpm --filter @kova/worker add @bull-board/api @bull-board/express express
pnpm --filter @kova/worker add -D vitest pino-pretty @types/express
```

- [ ] **Step 2: Add test script to worker/package.json**

In `worker/package.json`, add `"test": "vitest run"` to the `scripts` block:

```json
{
  "name": "@kova/worker",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node --import=tsx/esm src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Create worker/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
})
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

```bash
pnpm --filter @kova/worker test
```

Expected: `No test files found` or similar — no crash.

- [ ] **Step 5: Commit**

```bash
git add worker/package.json worker/vitest.config.ts pnpm-lock.yaml
git commit -m "chore: add vitest, pino-pretty, and @bull-board to worker"
```

---

## Task 3: S3 Chunk Downloader (TDD)

Downloads all S3 chunks for a call and returns a concatenated `Buffer` ready to send to Deepgram.

**Files:**
- Create: `worker/src/lib/s3.ts`
- Create: `worker/src/__tests__/s3.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/s3.test.ts`:

```typescript
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

    const instance = (S3Client as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value
      ?? { send: vi.fn() }
    mockSend = instance.send as ReturnType<typeof vi.fn>
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/worker test
```

Expected: FAIL with "Cannot find module '../lib/s3.js'"

- [ ] **Step 3: Create worker/src/lib/s3.ts**

```typescript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

let _s3: S3Client | null = null

function getS3Client(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return _s3
}

async function downloadObject(bucket: string, key: string): Promise<Buffer> {
  const res = await getS3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  if (!res.Body) throw new Error('S3 object has no body')
  const parts: Uint8Array[] = []
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    parts.push(chunk)
  }
  return Buffer.concat(parts)
}

/**
 * Download all S3 chunks for a call and return them concatenated in order.
 * AAC-LC ADTS files can be safely byte-concatenated.
 */
export async function downloadChunks(s3Keys: string[]): Promise<Buffer> {
  const bucket = process.env.S3_BUCKET_NAME!
  const buffers = await Promise.all(s3Keys.map((key) => downloadObject(bucket, key)))
  return Buffer.concat(buffers)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @kova/worker test
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/s3.ts worker/src/__tests__/s3.test.ts
git commit -m "feat: S3 chunk downloader with concatenation"
```

---

## Task 4: Deepgram Transcriber (TDD — 10 Synthetic Scenarios)

Sends a concatenated audio buffer to Deepgram Nova-3 Multilingual and maps the response to `TranscriptSegment[]` + metadata.

**Files:**
- Create: `worker/src/lib/deepgram.ts`
- Create: `worker/src/__tests__/deepgram.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/deepgram.test.ts`:

```typescript
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
import { transcribeAudio, type TranscriptionResult } from '../lib/deepgram.js'

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
  const client = (createClient as unknown as ReturnType<typeof vi.fn>).mock.results[0].value
  return client.listen.prerecorded.transcribeFile as ReturnType<typeof vi.fn>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('transcribeAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DEEPGRAM_API_KEY = 'test-key'
    // Re-apply createClient mock
    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      listen: {
        prerecorded: {
          transcribeFile: vi.fn(),
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/worker test
```

Expected: FAIL with "Cannot find module '../lib/deepgram.js'"

- [ ] **Step 3: Create worker/src/lib/deepgram.ts**

```typescript
import { createClient } from '@deepgram/sdk'
import type { Language } from '@kova/shared'
import type { TranscriptSegment } from '@kova/shared'

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

const DEEPGRAM_COST_PER_MIN = 0.0043

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
// Client (singleton)
// ---------------------------------------------------------------------------

let _deepgramClient: ReturnType<typeof createClient> | null = null

function getDeepgramClient() {
  if (!_deepgramClient) {
    _deepgramClient = createClient(process.env.DEEPGRAM_API_KEY!)
  }
  return _deepgramClient
}

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
  const { result, error } = await getDeepgramClient().listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: 'nova-3-multilingual',
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @kova/worker test
```

Expected: 14 tests PASS (3 from s3.test.ts + 11 from deepgram.test.ts)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/deepgram.ts worker/src/__tests__/deepgram.test.ts
git commit -m "feat: Deepgram Nova-3 Multilingual transcriber with diarization and keyterm prompting"
```

---

## Task 5: Wire Transcription Pipeline into Scoring Worker (TDD)

Implements the first four steps of the full pipeline in `scoring.ts`:
1. Parse + validate job payload
2. Set call status `pending → processing`
3. Download audio from S3
4. Transcribe with Deepgram
5. Write transcript + processing cost to DB
6. Set call status → `transcribed`

**Files:**
- Modify: `worker/src/workers/scoring.ts`
- Create: `worker/src/__tests__/scoring.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/scoring.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// All external dependencies are mocked before imports
vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  calls: {},
  transcripts: {},
  processingCosts: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('../lib/s3.js', () => ({
  downloadChunks: vi.fn(),
}))
vi.mock('../lib/deepgram.js', () => ({
  transcribeAudio: vi.fn(),
}))

import { db } from '@kova/db'
import { downloadChunks } from '../lib/s3.js'
import { transcribeAudio } from '../lib/deepgram.js'
import { processTranscription } from '../workers/scoring.js'

const MOCK_CALL = {
  id: 'call-1',
  language: 'en',
  durationSec: 300,
}

const MOCK_TRANSCRIPT_RESULT = {
  segments: [
    { speaker: 'speaker_0', text: 'Hello, drain is clogged.', startSec: 0, endSec: 3.5, language: 'en', confidence: 0.95 },
  ],
  language: 'en' as const,
  werConfidence: 0.95,
  durationSec: 300,
  costUsd: 0.0215,
}

describe('processTranscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // db.select: first call = fetch the call record
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([MOCK_CALL]),
      }),
    })

    // db.update: update call status
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    // db.insert: insert transcript + processingCosts
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'transcript-1' }]),
      }),
    })

    ;(downloadChunks as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      Buffer.from('fake-audio')
    )
    ;(transcribeAudio as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      MOCK_TRANSCRIPT_RESULT
    )
  })

  it('downloads audio, transcribes, and writes transcript to DB', async () => {
    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 300,
    })

    expect(downloadChunks).toHaveBeenCalledWith(['audio/co-1/sess-1/chunk_0.aac'])
    expect(transcribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
    expect(db.insert).toHaveBeenCalledTimes(2) // transcript + processingCosts
    expect(db.update).toHaveBeenCalledTimes(2) // status=processing + status=transcribed
  })

  it('sets call status to processing before transcribing', async () => {
    const statusUpdates: string[] = []
    const mockSet = vi.fn().mockImplementation((val: Record<string, string>) => {
      if (val.status) statusUpdates.push(val.status)
      return { where: vi.fn().mockResolvedValue(undefined) }
    })
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet })

    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 300,
    })

    expect(statusUpdates[0]).toBe('processing')
    expect(statusUpdates[1]).toBe('transcribed')
  })

  it('sets call status to failed when transcription throws', async () => {
    ;(transcribeAudio as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Deepgram transcription failed: bad key')
    )

    const statusUpdates: string[] = []
    const mockSet = vi.fn().mockImplementation((val: Record<string, string>) => {
      if (val.status) statusUpdates.push(val.status)
      return { where: vi.fn().mockResolvedValue(undefined) }
    })
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet })

    await expect(
      processTranscription({
        callId: 'call-1',
        s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
        totalDurationSec: 300,
      })
    ).rejects.toThrow('Deepgram transcription failed')

    expect(statusUpdates).toContain('failed')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/worker test
```

Expected: FAIL with "processTranscription is not exported" or similar

- [ ] **Step 3: Rewrite worker/src/workers/scoring.ts**

```typescript
import { Worker } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'
import { QUEUE_NAMES, JOB_NAMES, ScoringJobPayloadSchema } from '@kova/shared'
import { db, calls, transcripts, processingCosts } from '@kova/db'
import { eq } from 'drizzle-orm'
import { getRedisClient } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'
import { downloadChunks } from '../lib/s3.js'
import { transcribeAudio } from '../lib/deepgram.js'

const logger = createLogger('scoring-worker')

// ---------------------------------------------------------------------------
// processTranscription — exported for unit testing
// ---------------------------------------------------------------------------

export async function processTranscription(payload: {
  callId: string
  s3Keys: string[]
  totalDurationSec: number
  jobType?: string
}): Promise<void> {
  const { callId, s3Keys } = payload

  // Step 1: Fetch call from DB to get language hint
  const [call] = await db.select({ id: calls.id, language: calls.language, durationSec: calls.durationSec })
    .from(calls)
    .where(eq(calls.id, callId))

  if (!call) {
    throw new Error(`Call not found: ${callId}`)
  }

  // Step 2: Mark call as processing
  await db.update(calls)
    .set({ status: 'processing' })
    .where(eq(calls.id, callId))

  try {
    // Step 3: Download audio chunks from S3
    logger.info({ callId, chunkCount: s3Keys.length }, 'Downloading audio chunks')
    const audioBuffer = await downloadChunks(s3Keys)

    // Step 4: Transcribe with Deepgram Nova-3 Multilingual
    logger.info({ callId }, 'Transcribing with Deepgram Nova-3 Multilingual')
    const transcription = await transcribeAudio(audioBuffer, call.language as 'en' | 'es' | 'unknown')

    // Step 5: Write transcript record
    const transcriptId = uuidv4()
    await db.insert(transcripts).values({
      id: transcriptId,
      callId,
      segments: transcription.segments,
      language: transcription.language,
      werConfidence: transcription.werConfidence,
      provider: 'deepgram',
      model: 'nova-3-multilingual',
    }).returning({ id: transcripts.id })

    // Step 6: Write processing cost record
    await db.insert(processingCosts).values({
      callId,
      provider: 'deepgram',
      tokensIn: null,
      tokensOut: null,
      costUsd: transcription.costUsd,
    })

    // Step 7: Mark call as transcribed
    await db.update(calls)
      .set({ status: 'transcribed', transcriptId })
      .where(eq(calls.id, callId))

    logger.info({ callId, transcriptId, language: transcription.language }, 'Transcription complete')
  } catch (err) {
    // Mark failed so the worker can surface the error
    await db.update(calls)
      .set({ status: 'failed' })
      .where(eq(calls.id, callId))
    throw err
  }
}

// ---------------------------------------------------------------------------
// Scoring Worker
// ---------------------------------------------------------------------------

export const scoringWorker = new Worker(
  QUEUE_NAMES.SCORING,
  async (job) => {
    if (job.name !== JOB_NAMES.SCORE_CALL) {
      logger.warn({ jobName: job.name }, 'Unknown job name — skipping')
      return
    }

    const payload = ScoringJobPayloadSchema.parse(job.data)
    logger.info({ callId: payload.callId }, 'Processing scoring job')

    await processTranscription(payload)

    // TODO Week 5: Rules engine
    logger.info({ callId: payload.callId }, 'Step 3: Rules engine (TODO Week 5)')

    // TODO Week 6: GPT-5.4-mini scoring + score assembly + DB write
    logger.info({ callId: payload.callId }, 'Step 4: LLM scoring (TODO Week 6)')

    // TODO Week 7: Send push notification
    logger.info({ callId: payload.callId }, 'Step 7: Push notification (TODO Week 7)')

    return { callId: payload.callId, status: 'transcribed' }
  },
  {
    connection: getRedisClient(),
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @kova/worker test
```

Expected: 17 tests PASS (3 s3 + 11 deepgram + 3 scoring)

- [ ] **Step 5: Commit**

```bash
git add worker/src/workers/scoring.ts worker/src/__tests__/scoring.test.ts
git commit -m "feat: transcription pipeline in scoring worker — S3 download, Deepgram Nova-3, DB write"
```

---

## Task 6: Bull Board HTTP Server

Exposes Bull Board at `http://localhost:3001/bull-board` for job monitoring on Railway.

**Files:**
- Create: `worker/src/lib/bull-board.ts`
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Create worker/src/lib/bull-board.ts**

```typescript
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js'
import { ExpressAdapter } from '@bull-board/express'
import express from 'express'
import { Queue } from 'bullmq'
import { QUEUE_NAMES } from '@kova/shared'
import { getRedisClient } from './redis.js'
import { createLogger } from './logger.js'

const logger = createLogger('bull-board')
const BULL_BOARD_PORT = parseInt(process.env.BULL_BOARD_PORT ?? '3001', 10)

export function startBullBoard(): void {
  const scoringQueue = new Queue(QUEUE_NAMES.SCORING, {
    connection: getRedisClient(),
  })

  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/bull-board')

  createBullBoard({
    queues: [new BullMQAdapter(scoringQueue)],
    serverAdapter,
  })

  const app = express()
  app.use('/bull-board', serverAdapter.getRouter())
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))

  app.listen(BULL_BOARD_PORT, () => {
    logger.info({ port: BULL_BOARD_PORT }, `Bull Board running at http://localhost:${BULL_BOARD_PORT}/bull-board`)
  })
}
```

- [ ] **Step 2: Modify worker/src/index.ts to start Bull Board**

Replace `worker/src/index.ts` entirely:

```typescript
import { createClient } from './lib/redis.js'
import { createLogger } from './lib/logger.js'
import { scoringWorker } from './workers/scoring.js'
import { startBullBoard } from './lib/bull-board.js'

const logger = createLogger('worker')

async function main() {
  logger.info('Kova worker starting...')

  const redis = createClient()

  // Health check
  await redis.ping()
  logger.info('Redis connected')

  // Start Bull Board HTTP server (port 3001)
  startBullBoard()

  // Start workers
  scoringWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Scoring job completed')
  })

  scoringWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Scoring job failed')
  })

  logger.info('Worker ready. Waiting for jobs...')

  // Graceful shutdown
  async function shutdown() {
    logger.info('Shutting down worker...')
    await scoringWorker.close()
    await redis.quit()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('Worker failed to start:', err)
  process.exit(1)
})
```

- [ ] **Step 3: Add BULL_BOARD_PORT to .env.example**

In `.env.example`, at the end of the `# 7. Internal` section:

```
# Bull Board job monitoring (worker internal — not publicly accessible)
BULL_BOARD_PORT=3001
```

- [ ] **Step 4: Typecheck worker**

```bash
pnpm --filter @kova/worker typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/bull-board.ts worker/src/index.ts .env.example
git commit -m "feat: Bull Board HTTP server on port 3001 for job monitoring"
```

---

## Task 7: Full CI Simulation and Final Push

- [ ] **Step 1: Run full test suite**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm test
```

Expected: All tests pass — mobile (17) + web (6) + worker (17) = 40 tests

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: `Tasks: 5 successful, 5 total`

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: `Tasks: 5 successful, 5 total` (warnings OK, zero errors)

- [ ] **Step 4: Fix any lint errors**

Common issues to watch for:
- `@typescript-eslint/no-require-imports`: use ESM imports instead of `require()`
- `@typescript-eslint/consistent-type-imports`: use `import type` for type-only imports
- `no-undef` on `.js` test stubs: add to `eslint.config.mjs` ignores if needed

Run `pnpm lint` after fixes until zero errors.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "chore: Week 4 complete — Deepgram transcription pipeline, S3 downloader, Bull Board"
git push origin main
```

- [ ] **Step 6: Verify CI passes**

```bash
sleep 45 && gh run list --repo kova-ai-app/kova --limit 1
```

Then inspect the run:
```bash
gh run view <run-id> --repo kova-ai-app/kova
```

Expected: `✓ Lint, Typecheck & Test`

---

## Self-Review

**Spec coverage check:**

| Week 4 Requirement | Task |
|---|---|
| Deepgram Nova-3 Multilingual integration | Task 4 |
| Diarization, keyterm prompting, normalized output | Task 4 |
| Per-language confidence tracking (`werConfidence`) | Task 4 |
| Transcript stored as JSONB in `transcripts` | Task 5 |
| Call status: `pending → processing → transcribed` | Task 5 |
| Unit tests: 10 synthetic transcripts (5 EN, 3 ES, 2 bilingual) | Task 4 (scenarios 1–10) |
| `processing_costs` record per call | Task 5 |
| Bull Board at internal Railway URL | Task 6 |
| S3 chunk download + concatenation | Task 3 |
| Schema/payload alignment (was broken) | Task 1 |
