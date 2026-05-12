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

  async function processAndTime(audioPath: string): Promise<number> {
    // TODO: Implement when services are live:
    // 1. Upload audio to S3
    // 2. Invoke processTranscription (worker) or call upload-complete API
    // 3. Poll DB until status = 'scored' or 'failed' (max 6 minutes)
    // 4. Return elapsed milliseconds
    throw new Error('Not yet implemented — configure services first')
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
