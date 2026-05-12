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

  async function processCallAndGetScore(_audioPath: string): Promise<number> {
    // TODO: Implement when services are live:
    // 1. Upload audio to S3 using AWS SDK
    // 2. Call the worker's processTranscription directly (or via API)
    // 3. Poll DB until call status = 'scored'
    // 4. Return the overallScore
    throw new Error('Not yet implemented — configure services and audio fixtures first')
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
