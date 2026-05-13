/**
 * Cross-Language Score Parity Gate
 *
 * Week 10 requirement: Spanish scores must not diverge > 10 points from English.
 *
 * Run when services are live:
 *   pnpm vitest run --config scripts/vitest.integration.config.ts
 *
 * Requires: DEEPGRAM_API_KEY, OPENAI_API_KEY, DATABASE_URL, AWS_ACCESS_KEY_ID
 * Requires: audio fixtures in scripts/fixtures/ (20 EN + 20 ES + 10 bilingual .aac files)
 */
import { describe, it, expect } from 'vitest'

const REQUIRED_ENV = [
  'DEEPGRAM_API_KEY',
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
]
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k])

if (missingEnv.length > 0) {
  console.log(
    `Cross-language parity test SKIPPED — missing env vars: ${missingEnv.join(', ')}\n` +
    `   Configure external services and add audio fixtures to scripts/fixtures/ to enable.`
  )
}

describe.skipIf(missingEnv.length > 0)('Cross-Language Score Parity Gate', () => {
  const FIXTURE_DIR = new URL('./fixtures', import.meta.url).pathname

  const TEST_CALLS = {
    en: Array.from({ length: 20 }, (_, i) => `${FIXTURE_DIR}/en_call_${i + 1}.aac`),
    es: Array.from({ length: 20 }, (_, i) => `${FIXTURE_DIR}/es_call_${i + 1}.aac`),
    bilingual: Array.from({ length: 10 }, (_, i) => `${FIXTURE_DIR}/bi_call_${i + 1}.aac`),
  }

  async function processCallAndGetScore(fixturePath: string): Promise<number> {
    const fs = await import('fs')
    const path = await import('path')
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

    // 1. Read audio fixture
    const audioBuffer = fs.readFileSync(path.resolve(fixturePath))

    // 2. Upload to S3 / R2
    const s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: !!process.env.S3_ENDPOINT,
    })

    const sessionId = `parity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const companyId = 'test-company'
    const s3Key = `audio/${companyId}/${sessionId}/chunk_0.aac`

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME ?? 'kova-audio',
      Key: s3Key,
      Body: audioBuffer,
      ContentType: 'audio/aac',
    }))

    // 3. Trigger upload-complete to enqueue scoring job
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000'
    const createRes = await fetch(`${apiBase}/api/calls/upload-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        callId: sessionId,
        companyId,
        techId: 'test-tech',
        s3Key,
        durationSec: 600,
        chunkCount: 1,
        jobType: 'drain',
        consentLoggedAt: new Date().toISOString(),
      }),
    })

    if (!createRes.ok) {
      throw new Error(`upload-complete failed: ${createRes.status} ${await createRes.text()}`)
    }

    const callId = ((await createRes.json()) as { callId: string }).callId

    // 4. Poll for scored status (up to 5 minutes)
    const deadline = Date.now() + 5 * 60 * 1000
    while (Date.now() < deadline) {
      const statusRes = await fetch(`${apiBase}/api/calls/${callId}`)
      if (statusRes.ok) {
        const data = (await statusRes.json()) as {
          call: { status: string }
          score: { overallScore: number } | null
        }
        if (data.call?.status === 'scored' && data.score?.overallScore != null) {
          return data.score.overallScore
        }
        if (data.call?.status === 'failed') {
          throw new Error(`Call processing failed: ${callId}`)
        }
      }
      await new Promise((r) => setTimeout(r, 5000))
    }

    throw new Error(`Timed out waiting for score: ${callId}`)
  }

  it('scores 50 calls — Spanish avg must be within 10 points of English avg', async () => {
    const scores: { en: number[]; es: number[]; bilingual: number[] } = {
      en: [],
      es: [],
      bilingual: [],
    }

    for (const file of TEST_CALLS.en) {
      scores.en.push(await processCallAndGetScore(file))
    }
    for (const file of TEST_CALLS.es) {
      scores.es.push(await processCallAndGetScore(file))
    }
    for (const file of TEST_CALLS.bilingual) {
      scores.bilingual.push(await processCallAndGetScore(file))
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    const enAvg = avg(scores.en)
    const esAvg = avg(scores.es)
    const biAvg = avg(scores.bilingual)

    console.table([
      { language: 'English', count: scores.en.length, avg: enAvg.toFixed(1) },
      { language: 'Spanish', count: scores.es.length, avg: esAvg.toFixed(1) },
      { language: 'Bilingual', count: scores.bilingual.length, avg: biAvg.toFixed(1) },
    ])

    const enEsGap = Math.abs(enAvg - esAvg)
    const enBiGap = Math.abs(enAvg - biAvg)

    console.log(`EN-ES gap: ${enEsGap.toFixed(1)} points (limit: 10)`)
    console.log(`EN-BI gap: ${enBiGap.toFixed(1)} points (limit: 10)`)

    expect(enEsGap, `Spanish scores diverge from English by ${enEsGap.toFixed(1)} pts (max 10)`).toBeLessThanOrEqual(10)
    expect(enBiGap, `Bilingual scores diverge from English by ${enBiGap.toFixed(1)} pts (max 10)`).toBeLessThanOrEqual(10)
  })
})
