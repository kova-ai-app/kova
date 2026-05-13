/**
 * Performance Gate
 *
 * Week 10 requirement: 10 recordings, all scored in under 5 minutes each.
 *
 * Run when services are live:
 *   pnpm vitest run --config scripts/vitest.integration.config.ts
 *
 * Requires: All external services configured + test audio files.
 */
import { describe, it, expect } from 'vitest'

const REQUIRED_ENV = [
  'DEEPGRAM_API_KEY',
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'REDIS_URL',
]
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k])
const MAX_SCORING_TIME_MS = 5 * 60 * 1000 // 5 minutes

if (missingEnv.length > 0) {
  console.log(
    `Performance benchmark SKIPPED — missing env vars: ${missingEnv.join(', ')}\n` +
    `   Configure all external services to enable.`
  )
}

describe.skipIf(missingEnv.length > 0)('Performance Benchmark Gate', () => {
  const FIXTURE_DIR = new URL('./fixtures', import.meta.url).pathname
  const TEST_RECORDINGS = Array.from(
    { length: 10 },
    (_, i) => `${FIXTURE_DIR}/perf_call_${i + 1}.aac`
  )

  async function processAndTime(fixturePath: string): Promise<number> {
    const fs = await import('fs')
    const path = await import('path')
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

    const startMs = Date.now()

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

    const sessionId = `perf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
      throw new Error(`upload-complete failed: ${createRes.status}`)
    }

    const callId = ((await createRes.json()) as { callId: string }).callId

    // 4. Poll for scored status (up to 5 minutes)
    const deadline = Date.now() + 5 * 60 * 1000
    while (Date.now() < deadline) {
      const statusRes = await fetch(`${apiBase}/api/calls/${callId}`)
      if (statusRes.ok) {
        const data = (await statusRes.json()) as { call: { status: string } }
        if (data.call?.status === 'scored') {
          return Date.now() - startMs
        }
        if (data.call?.status === 'failed') {
          throw new Error(`Call processing failed: ${callId}`)
        }
      }
      await new Promise((r) => setTimeout(r, 3000))
    }

    throw new Error(`Timed out waiting for score: ${callId}`)
  }

  it('all 10 recordings scored within 5 minutes each', async () => {
    const results: Array<{ file: string; durationMs: number; passed: boolean }> = []

    for (const file of TEST_RECORDINGS) {
      const durationMs = await processAndTime(file)
      results.push({ file, durationMs, passed: durationMs < MAX_SCORING_TIME_MS })
    }

    console.table(
      results.map((r) => ({
        file: r.file.split('/').pop(),
        time: `${(r.durationMs / 1000).toFixed(1)}s`,
        status: r.passed ? 'PASS' : 'FAIL',
      }))
    )

    const failures = results.filter((r) => !r.passed)
    if (failures.length > 0) {
      console.error(
        `${failures.length} recording(s) exceeded 5 minute limit:`,
        failures.map((r) => `${r.file.split('/').pop()} (${(r.durationMs / 1000).toFixed(0)}s)`)
      )
    }

    expect(
      failures.length,
      `${failures.length} recording(s) exceeded the 5-minute scoring threshold`
    ).toBe(0)
  })
})
