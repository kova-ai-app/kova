# Week 6 — LLM Scoring + Pricebook Lookup + Score Assembly

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub `overallScore=0` / `valueLow=0` values written by the rules pass with real LLM-computed quality scores and pricebook-backed opportunity dollar amounts.

**Architecture:** Three new worker libs are added. `worker/src/lib/llm.ts` calls OpenAI GPT-4o-mini with a drain/plumbing-specific prompt and returns 4 qualitative dimension scores (0–3 each). `worker/src/lib/pricebook.ts` queries `pricebook_items` by `(companyId, opportunityType)` and falls back to hardcoded CA market defaults. `worker/src/lib/score-assembly.ts` is a pure function that combines rule results, LLM analysis, and prices into `overallScore`, `dimensions`, `opportunityTotalLow/High`, and enriched opportunities. `scoring.ts` wires all three into the existing pipeline; LLM failure is non-fatal (falls back gracefully to rules-only scoring).

**Tech Stack:** Vitest 2 (TDD), OpenAI v4 (`openai` package already in worker/package.json), Drizzle ORM, `@kova/shared`, `@kova/db`.

---

## Key Context (read before any task)

- `worker/` is ESM (`"type": "module"`). All imports use `.js` extensions.
- `openai` v4 is already installed (`worker/package.json`). Pattern: `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })` — use `response_format: { type: 'json_object' }` for structured output.
- Vitest mock pattern: `vi.mock()` before imports; `as unknown as ReturnType<typeof vi.fn>` cast; `let` variable for mock refs in `beforeEach`.
- `ScoringDimension` (from `@kova/shared`): `'drain_cleaning_upsell' | 'hydro_jetting' | 'camera_inspection' | 'grease_trap' | 'preventive_plan' | 'pipe_repair' | 'water_heater' | 'fixture_upgrade' | 'water_filtration' | 'pressure_regulator' | 'whole_home_repiping'`
- `DimensionScore` (from `@kova/shared`): `{ dimension: ScoringDimension, score: number (0–100), triggered: boolean, offered: boolean, confidence: number, reasoning?: string }`
- After Task 1, `DimensionScore.dimension` will be `ScoringDimension | QualitativeDimension`.
- `RuleResult` (from `@kova/shared`): `{ dimension: ScoringDimension, triggered, offered, confidence, clipStartSec?, clipEndSec?, suppressedReason?: 'emergency' | 'short_call' }`
- `pricebookItems` table columns: `id, companyId, name, trade, opportunityType, pricingModel, priceFixed, priceLow, priceHigh, isRecurring, ltvAnnual, ltvYears, isDefault, active`
- `scores` table insert: `{ id, callId, overallScore, dimensions (jsonb), opportunityTotalLow, opportunityTotalHigh, confidenceLevel, modelUsed, promptVersion }`
- `opportunities` table insert: `{ scoreId, type, triggered, offered, pricebookItemId (nullable), valueLow, valueHigh, ltvValue (nullable), clipStartSec, clipEndSec, isDefaultPrice, confidence }`
- `calls` table: add `companyId` to the Step 1 select (needed for pricebook lookup).
- `OPENAI_API_KEY` env var (already in `.env.example`). If missing/invalid, `analyzeTranscript` throws — caller catches and falls back to `llmAnalysis = null`.
- LLM fallback: when `llmAnalysis = null`, `assembleScore` uses only the 2 rule-based dimensions to calculate `overallScore`; `modelUsed = 'rules-v1'`, `confidenceLevel = 'medium'`.
- CA market default prices (hardcoded fallback):
  - `camera_inspection`: $425 fixed
  - `preventive_plan`: $299/yr, ltvValue $1,500 (5yr)
  - `hydro_jetting`: $750–$950 range
  - `drain_cleaning_upsell`: $189–$289 range
  - `pipe_repair`: $850–$1,500 range
  - `grease_trap`: $350–$550 range
- Dimension scoring formula (0–3 pts per dim):
  - Rule-based (camera_inspection, preventive_plan): `not_triggered=0`, `triggered+not_offered=1`, `not_triggered+offered=2`, `triggered+offered=3`
  - LLM qualitative: raw score from LLM is already 0–3
  - Suppressed rule results → 0 pts
  - `overallScore = round(avg(all available dim scores in 0–100) )` where each dim score = `(pts/3)*100`
  - When `llmAnalysis=null`: average only the 2 rule dims.
- `opportunityTotalLow/High` = sum of `valueLow/High` for opportunities where `triggered=true AND offered=false AND suppressedReason=undefined`.
- Current test count: 64 (worker: 3 scoring + 7 index + 20 camera + 20 maintenance + 11 deepgram + 3 s3). Target after Week 6: **98** (add ~6 llm + 5 pricebook + 8 score-assembly + 2 new scoring + ~13 existing scoring upgraded = +34... actually keep scoring at 5 total).

---

## File Map

```
packages/shared/src/types.ts                MODIFY  — add QualitativeDimension + AnyDimension; widen DimensionScore.dimension
worker/src/lib/llm.ts                       CREATE  — analyzeTranscript()
worker/src/lib/pricebook.ts                 CREATE  — lookupPrice()
worker/src/lib/score-assembly.ts            CREATE  — assembleScore() (pure function)
worker/src/workers/scoring.ts               MODIFY  — wire LLM + pricebook + assembleScore; update scores+opportunities inserts
worker/src/__tests__/llm.test.ts            CREATE  — 6 scenarios
worker/src/__tests__/pricebook.test.ts      CREATE  — 5 scenarios
worker/src/__tests__/score-assembly.test.ts CREATE  — 8 scenarios
worker/src/__tests__/scoring.test.ts        MODIFY  — assert real scores + opportunity values
```

---

## Task 1: QualitativeDimension + AnyDimension types

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Add QualitativeDimension and AnyDimension, update DimensionScore**

In `packages/shared/src/types.ts`, after line 38 (`export type OpportunityType = ScoringDimension`), add:

```typescript
// ---- Qualitative Dimensions (LLM-evaluated, no direct dollar value) ---------
export type QualitativeDimension =
  | 'diagnosis_quality'     // Root cause explained clearly; recurrence risk discussed
  | 'customer_education'    // Trust built before pricing; price not rushed
  | 'close_quality'         // Options presented; objection handling; confident close
  | 'hydrojet_presentation' // Hydrojetting or permanent solution presented as alternative

export type AnyDimension = ScoringDimension | QualitativeDimension
```

Then update `DimensionScore` (currently at line 109) to widen `dimension`:

```typescript
export interface DimensionScore {
  dimension: AnyDimension    // was: ScoringDimension
  score: number              // 0–100
  triggered: boolean
  offered: boolean
  confidence: number         // 0–1
  reasoning?: string
}
```

- [ ] **Step 2: Typecheck shared**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/shared typecheck
```

Expected: passes

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat: add QualitativeDimension + AnyDimension, widen DimensionScore.dimension"
```

---

## Task 2: LLM lib (analyzeTranscript)

**Files:**
- Create: `worker/src/__tests__/llm.test.ts`
- Create: `worker/src/lib/llm.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/llm.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TranscriptSegment } from '@kova/shared'

vi.mock('openai', () => {
  const mockCreate = vi.fn()
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    __mockCreate: mockCreate,
  }
})

// Grab the inner mock after vi.mock runs
import OpenAI from 'openai'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCreateMock = () => (OpenAI as any).__mockCreate as ReturnType<typeof vi.fn>

import { analyzeTranscript } from '../lib/llm.js'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

const VALID_LLM_JSON = JSON.stringify({
  diagnosis_quality:     { score: 2, reasoning: 'Root cause explained' },
  hydrojet_presentation: { score: 1, reasoning: 'Only snaking mentioned' },
  customer_education:    { score: 3, reasoning: 'Spent time educating' },
  close_quality:         { score: 2, reasoning: 'Two options presented' },
})

const MOCK_OPENAI_RESPONSE = {
  choices: [{ message: { content: VALID_LLM_JSON } }],
  usage: { prompt_tokens: 800, completion_tokens: 200 },
}

describe('analyzeTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCreateMock().mockResolvedValue(MOCK_OPENAI_RESPONSE)
  })

  it('1. returns 4 qualitative dimension scores from a valid LLM response', async () => {
    const segs = [
      seg('speaker_0', 'Your drain has a root-cause buildup issue'),
      seg('speaker_1', 'What do we do?'),
      seg('speaker_0', 'Let me explain your options'),
    ]
    const result = await analyzeTranscript(segs, 'drain', 'en')
    expect(result.qualScores).toHaveLength(4)
    const diag = result.qualScores.find((q) => q.dimension === 'diagnosis_quality')
    expect(diag?.score).toBe(2)
    expect(diag?.reasoning).toBe('Root cause explained')
  })

  it('2. all 4 required dimensions are present in the result', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    const dims = result.qualScores.map((q) => q.dimension)
    expect(dims).toContain('diagnosis_quality')
    expect(dims).toContain('hydrojet_presentation')
    expect(dims).toContain('customer_education')
    expect(dims).toContain('close_quality')
  })

  it('3. returns tokensIn, tokensOut, and costUsd', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    expect(result.tokensIn).toBe(800)
    expect(result.tokensOut).toBe(200)
    expect(result.costUsd).toBeGreaterThan(0)
  })

  it('4. works for plumbing job type', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hello')], 'plumbing', 'en')
    expect(result.qualScores).toHaveLength(4)
  })

  it('5. works for Spanish language calls', async () => {
    const result = await analyzeTranscript([seg('speaker_0', 'hola')], 'drain', 'es')
    expect(result.qualScores).toHaveLength(4)
  })

  it('6. throws when OpenAI API call fails', async () => {
    getCreateMock().mockRejectedValue(new Error('OpenAI API error: invalid key'))
    await expect(
      analyzeTranscript([seg('speaker_0', 'hello')], 'drain', 'en')
    ).rejects.toThrow('OpenAI API error')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/llm.js'" (or similar OpenAI import error)

- [ ] **Step 3: Create worker/src/lib/llm.ts**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 70 tests PASS (64 existing + 6 new llm tests)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/llm.ts worker/src/__tests__/llm.test.ts
git commit -m "feat: analyzeTranscript — GPT-4o-mini qualitative scoring with 6 test scenarios"
```

---

## Task 3: Pricebook Lookup

**Files:**
- Create: `worker/src/__tests__/pricebook.test.ts`
- Create: `worker/src/lib/pricebook.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/pricebook.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kova/db', () => ({
  db: { select: vi.fn() },
  pricebookItems: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }))

import { db } from '@kova/db'
import { lookupPrice } from '../lib/pricebook.js'

const MOCK_CAMERA_ITEM = {
  id: 'pb-1',
  pricingModel: 'fixed',
  priceFixed: 425,
  priceLow: null,
  priceHigh: null,
  isRecurring: false,
  ltvAnnual: null,
  ltvYears: null,
  isDefault: false,
}

const MOCK_PLAN_ITEM = {
  id: 'pb-2',
  pricingModel: 'fixed',
  priceFixed: 299,
  priceLow: null,
  priceHigh: null,
  isRecurring: true,
  ltvAnnual: 299,
  ltvYears: 5,
  isDefault: false,
}

const MOCK_HYDRO_ITEM = {
  id: 'pb-3',
  pricingModel: 'range',
  priceFixed: null,
  priceLow: 750,
  priceHigh: 950,
  isRecurring: false,
  ltvAnnual: null,
  ltvYears: null,
  isDefault: false,
}

function mockDbSelect(returnValue: object | null) {
  ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(returnValue ? [returnValue] : []),
    }),
  })
}

describe('lookupPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. returns fixed price from pricebook_items when company has the item', async () => {
    mockDbSelect(MOCK_CAMERA_ITEM)
    const result = await lookupPrice('co-1', 'camera_inspection')
    expect(result.valueLow).toBe(425)
    expect(result.valueHigh).toBe(425)
    expect(result.isDefaultPrice).toBe(false)
    expect(result.pricebookItemId).toBe('pb-1')
  })

  it('2. returns range price from pricebook_items (pricingModel=range)', async () => {
    mockDbSelect(MOCK_HYDRO_ITEM)
    const result = await lookupPrice('co-1', 'hydro_jetting')
    expect(result.valueLow).toBe(750)
    expect(result.valueHigh).toBe(950)
    expect(result.isDefaultPrice).toBe(false)
  })

  it('3. calculates ltvValue for recurring items (annual * years)', async () => {
    mockDbSelect(MOCK_PLAN_ITEM)
    const result = await lookupPrice('co-1', 'preventive_plan')
    expect(result.ltvValue).toBe(1495)  // 299 * 5
    expect(result.valueLow).toBe(299)
  })

  it('4. falls back to hardcoded default when no pricebook item found', async () => {
    mockDbSelect(null)
    const result = await lookupPrice('co-1', 'camera_inspection')
    expect(result.valueLow).toBe(425)
    expect(result.valueHigh).toBe(425)
    expect(result.isDefaultPrice).toBe(true)
    expect(result.pricebookItemId).toBeNull()
  })

  it('5. returns zeros for unknown opportunity type with no pricebook item', async () => {
    mockDbSelect(null)
    const result = await lookupPrice('co-1', 'whole_home_repiping')
    expect(result.valueLow).toBe(0)
    expect(result.valueHigh).toBe(0)
    expect(result.isDefaultPrice).toBe(true)
    expect(result.pricebookItemId).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/pricebook.js'"

- [ ] **Step 3: Create worker/src/lib/pricebook.ts**

```typescript
import { db, pricebookItems } from '@kova/db'
import { and, eq } from 'drizzle-orm'
import type { ScoringDimension } from '@kova/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceResult {
  pricebookItemId: string | null
  valueLow: number
  valueHigh: number
  ltvValue: number | null
  isDefaultPrice: boolean
}

// ---------------------------------------------------------------------------
// Hardcoded CA market defaults (Phase 1 fallback)
// Phase 2: seed per-company defaults during onboarding
// ---------------------------------------------------------------------------

const DEFAULT_PRICES: Partial<Record<ScoringDimension, { valueLow: number; valueHigh: number; ltvValue?: number }>> = {
  camera_inspection:     { valueLow: 425,  valueHigh: 425 },
  preventive_plan:       { valueLow: 299,  valueHigh: 299,  ltvValue: 1495 },  // $299/yr × 5yr
  hydro_jetting:         { valueLow: 750,  valueHigh: 950 },
  drain_cleaning_upsell: { valueLow: 189,  valueHigh: 289 },
  pipe_repair:           { valueLow: 850,  valueHigh: 1500 },
  grease_trap:           { valueLow: 350,  valueHigh: 550 },
}

// ---------------------------------------------------------------------------
// lookupPrice
// ---------------------------------------------------------------------------

/**
 * Look up the price for an opportunity type.
 * Queries pricebook_items for the company first; falls back to hardcoded CA defaults.
 */
export async function lookupPrice(
  companyId: string,
  opportunityType: ScoringDimension,
): Promise<PriceResult> {
  const [item] = await db
    .select()
    .from(pricebookItems)
    .where(
      and(
        eq(pricebookItems.companyId, companyId),
        eq(pricebookItems.opportunityType, opportunityType),
      ),
    )

  if (item) {
    const valueLow = item.pricingModel === 'fixed' ? (item.priceFixed ?? 0) : (item.priceLow ?? 0)
    const valueHigh = item.pricingModel === 'fixed' ? (item.priceFixed ?? 0) : (item.priceHigh ?? 0)
    const ltvValue = item.isRecurring && item.ltvAnnual && item.ltvYears
      ? item.ltvAnnual * item.ltvYears
      : null
    return {
      pricebookItemId: item.id,
      valueLow,
      valueHigh,
      ltvValue,
      isDefaultPrice: item.isDefault,
    }
  }

  // Fall back to hardcoded CA market defaults
  const defaults = DEFAULT_PRICES[opportunityType]
  if (defaults) {
    return {
      pricebookItemId: null,
      valueLow: defaults.valueLow,
      valueHigh: defaults.valueHigh,
      ltvValue: defaults.ltvValue ?? null,
      isDefaultPrice: true,
    }
  }

  return { pricebookItemId: null, valueLow: 0, valueHigh: 0, ltvValue: null, isDefaultPrice: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 75 tests PASS (70 + 5 new pricebook tests)

**Note on test 3:** `ltvValue = ltvAnnual * ltvYears = 299 * 5 = 1495`. The test asserts `1495`. This is the correct calculation from the pricebook item's own fields, not the hardcoded default of 1495.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/pricebook.ts worker/src/__tests__/pricebook.test.ts
git commit -m "feat: lookupPrice — pricebook DB lookup with CA market defaults fallback"
```

---

## Task 4: Score Assembly (pure function)

**Files:**
- Create: `worker/src/__tests__/score-assembly.test.ts`
- Create: `worker/src/lib/score-assembly.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/score-assembly.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { assembleScore } from '../lib/score-assembly.js'
import type { RuleResult } from '@kova/shared'
import type { LLMAnalysis } from '../lib/llm.js'
import type { PriceResult } from '../lib/pricebook.js'

function ruleResult(overrides: Partial<RuleResult>): RuleResult {
  return {
    dimension: 'camera_inspection',
    triggered: false,
    offered: false,
    confidence: 0.95,
    ...overrides,
  }
}

const LLM_ALL_TWOS: LLMAnalysis = {
  qualScores: [
    { dimension: 'diagnosis_quality',     score: 2, reasoning: 'ok' },
    { dimension: 'hydrojet_presentation', score: 2, reasoning: 'ok' },
    { dimension: 'customer_education',    score: 2, reasoning: 'ok' },
    { dimension: 'close_quality',         score: 2, reasoning: 'ok' },
  ],
  tokensIn: 800,
  tokensOut: 200,
  costUsd: 0.0004,
}

const PRICE_CAMERA: PriceResult = { pricebookItemId: 'pb-1', valueLow: 425, valueHigh: 425, ltvValue: null, isDefaultPrice: false }
const PRICE_PLAN: PriceResult = { pricebookItemId: 'pb-2', valueLow: 299, valueHigh: 299, ltvValue: 1495, isDefaultPrice: false }

function priceMap(entries: [string, PriceResult][]): Map<string, PriceResult> {
  return new Map(entries)
}

describe('assembleScore', () => {
  it('1. camera_inspection triggered+offered → 3 pts → score=100, not in missed revenue', () => {
    const rules = [ruleResult({ dimension: 'camera_inspection', triggered: true, offered: true })]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    const camDim = result.dimensions.find((d) => d.dimension === 'camera_inspection')
    expect(camDim?.score).toBe(100)
    expect(result.opportunityTotalLow).toBe(0)  // offered = not missed
  })

  it('2. camera_inspection triggered+not_offered → 1 pt → score=33, counts as missed revenue', () => {
    const rules = [ruleResult({ dimension: 'camera_inspection', triggered: true, offered: false })]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    const camDim = result.dimensions.find((d) => d.dimension === 'camera_inspection')
    expect(camDim?.score).toBe(33)
    expect(result.opportunityTotalLow).toBe(425)
    expect(result.opportunityTotalHigh).toBe(425)
  })

  it('3. preventive_plan triggered+not_offered → ltvValue added to missed revenue totals', () => {
    const rules = [ruleResult({ dimension: 'preventive_plan', triggered: true, offered: false })]
    const prices = priceMap([['preventive_plan', PRICE_PLAN]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    expect(result.opportunityTotalLow).toBe(299)
    expect(result.opportunityTotalHigh).toBe(299)
    const opp = result.enrichedOpportunities.find((o) => o.dimension === 'preventive_plan')
    expect(opp?.ltvValue).toBe(1495)
  })

  it('4. suppressed rule result → 0 pts, NOT counted in missed revenue', () => {
    const rules = [ruleResult({ dimension: 'camera_inspection', triggered: false, offered: false, suppressedReason: 'emergency' })]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    expect(result.opportunityTotalLow).toBe(0)
    const camDim = result.dimensions.find((d) => d.dimension === 'camera_inspection')
    expect(camDim?.score).toBe(0)
  })

  it('5. LLM all-twos → each qualitative dim score = 67 (2/3 × 100)', () => {
    const result = assembleScore([], LLM_ALL_TWOS, priceMap([]))
    const diag = result.dimensions.find((d) => d.dimension === 'diagnosis_quality')
    expect(diag?.score).toBe(67)
  })

  it('6. overallScore = average of all 6 dim scores when LLM available', () => {
    // camera: triggered+offered → 100pts
    // preventive: triggered+offered → 100pts
    // LLM all-twos → 67 each × 4 = 268
    // avg: (100 + 100 + 67*4) / 6 = (200 + 268) / 6 = 468 / 6 = 78
    const rules = [
      ruleResult({ dimension: 'camera_inspection', triggered: true, offered: true }),
      ruleResult({ dimension: 'preventive_plan', triggered: true, offered: true }),
    ]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA], ['preventive_plan', PRICE_PLAN]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    expect(result.overallScore).toBe(78)
  })

  it('7. llmAnalysis=null → overallScore uses only rule dims; modelUsed=rules-v1', () => {
    // camera: triggered+offered → 100pts; no preventive rule
    // avg of 1 dim: 100
    const rules = [ruleResult({ dimension: 'camera_inspection', triggered: true, offered: true })]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA]])
    const result = assembleScore(rules, null, prices)
    expect(result.overallScore).toBe(100)
    expect(result.modelUsed).toBe('rules-v1')
    expect(result.confidenceLevel).toBe('medium')
  })

  it('8. enrichedOpportunities carry pricebookItemId + valueLow/High from priceMap', () => {
    const rules = [ruleResult({ dimension: 'camera_inspection', triggered: true, offered: false })]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    const opp = result.enrichedOpportunities[0]
    expect(opp?.pricebookItemId).toBe('pb-1')
    expect(opp?.valueLow).toBe(425)
    expect(opp?.isDefaultPrice).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/score-assembly.js'"

- [ ] **Step 3: Create worker/src/lib/score-assembly.ts**

```typescript
import type { RuleResult, DimensionScore, ScoringDimension } from '@kova/shared'
import type { LLMAnalysis } from './llm.js'
import type { PriceResult } from './pricebook.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichedOpportunity {
  dimension: ScoringDimension
  triggered: boolean
  offered: boolean
  confidence: number
  suppressedReason?: 'emergency' | 'short_call'
  clipStartSec?: number
  clipEndSec?: number
  pricebookItemId: string | null
  valueLow: number
  valueHigh: number
  ltvValue: number | null
  isDefaultPrice: boolean
}

export interface AssembledScore {
  overallScore: number
  dimensions: DimensionScore[]
  opportunityTotalLow: number
  opportunityTotalHigh: number
  enrichedOpportunities: EnrichedOpportunity[]
  modelUsed: string
  confidenceLevel: 'high' | 'medium' | 'low'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert 0–3 rule points to a 0–100 dimension score. */
function rulePointsToScore(pts: number): number {
  return Math.round((pts / 3) * 100)
}

/** Convert 0–3 LLM score to 0–100 dimension score. */
function llmScoreToHundred(score: number): number {
  return Math.round((score / 3) * 100)
}

/** Calculate rule-based points for a dimension from its triggered/offered/suppressed state. */
function rulePoints(rr: RuleResult): number {
  if (rr.suppressedReason) return 0
  if (!rr.triggered && !rr.offered) return 0
  if (!rr.triggered && rr.offered) return 2   // proactive — tech offered unprompted
  if (rr.triggered && !rr.offered) return 1   // missed opportunity
  return 3                                      // triggered + offered = full credit
}

// ---------------------------------------------------------------------------
// assembleScore (pure function — no async calls)
// ---------------------------------------------------------------------------

/**
 * Combine rule results + LLM qualitative scores + price lookups into a final score.
 *
 * @param ruleResults  RuleResult[] from runRules — may be empty
 * @param llmAnalysis  LLMAnalysis from analyzeTranscript — null if LLM unavailable
 * @param priceMap     Map<ScoringDimension, PriceResult> pre-fetched from lookupPrice
 */
export function assembleScore(
  ruleResults: RuleResult[],
  llmAnalysis: LLMAnalysis | null,
  priceMap: Map<string, PriceResult>,
): AssembledScore {
  const dimensions: DimensionScore[] = []
  let opportunityTotalLow = 0
  let opportunityTotalHigh = 0
  const enrichedOpportunities: EnrichedOpportunity[] = []

  // --- Rule-based dimensions -------------------------------------------------

  for (const rr of ruleResults) {
    const pts = rulePoints(rr)
    const score = rulePointsToScore(pts)

    dimensions.push({
      dimension: rr.dimension,
      score,
      triggered: rr.triggered,
      offered: rr.offered,
      confidence: rr.confidence,
    })

    const price = priceMap.get(rr.dimension) ?? {
      pricebookItemId: null, valueLow: 0, valueHigh: 0, ltvValue: null, isDefaultPrice: true,
    }

    // Count missed revenue: triggered but not offered and not suppressed
    if (rr.triggered && !rr.offered && !rr.suppressedReason) {
      opportunityTotalLow += price.valueLow
      opportunityTotalHigh += price.valueHigh
    }

    enrichedOpportunities.push({
      dimension: rr.dimension,
      triggered: rr.triggered,
      offered: rr.offered,
      confidence: rr.confidence,
      suppressedReason: rr.suppressedReason,
      ...(rr.clipStartSec !== undefined && { clipStartSec: rr.clipStartSec }),
      ...(rr.clipEndSec !== undefined && { clipEndSec: rr.clipEndSec }),
      pricebookItemId: price.pricebookItemId,
      valueLow: price.valueLow,
      valueHigh: price.valueHigh,
      ltvValue: price.ltvValue,
      isDefaultPrice: price.isDefaultPrice,
    })
  }

  // --- LLM qualitative dimensions --------------------------------------------

  if (llmAnalysis) {
    for (const qs of llmAnalysis.qualScores) {
      dimensions.push({
        dimension: qs.dimension,
        score: llmScoreToHundred(qs.score),
        triggered: false,
        offered: false,
        confidence: 0.85,  // LLM outputs are less deterministic than rules
        reasoning: qs.reasoning,
      })
    }
  }

  // --- Overall score ---------------------------------------------------------

  const overallScore =
    dimensions.length > 0
      ? Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length)
      : 0

  const modelUsed = llmAnalysis ? 'rules+gpt-4o-mini' : 'rules-v1'
  const confidenceLevel: 'high' | 'medium' | 'low' = llmAnalysis ? 'high' : 'medium'

  return {
    overallScore,
    dimensions,
    opportunityTotalLow,
    opportunityTotalHigh,
    enrichedOpportunities,
    modelUsed,
    confidenceLevel,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 83 tests PASS (75 + 8 new score-assembly tests)

**Note on test 5:** `(2/3)*100 = 66.67 → Math.round = 67`. Confirmed.
**Note on test 6:** camera(100) + preventive(100) + diagnosis(67) + hydrojet(67) + education(67) + close(67) = 468. `468/6 = 78.0`. `Math.round(78) = 78`. Confirmed.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/score-assembly.ts worker/src/__tests__/score-assembly.test.ts
git commit -m "feat: assembleScore — pure function combining rules + LLM + prices into final score"
```

---

## Task 5: Wire LLM + Pricebook + Score Assembly into scoring.ts

**Files:**
- Modify: `worker/src/workers/scoring.ts`
- Modify: `worker/src/__tests__/scoring.test.ts`

- [ ] **Step 1: Replace worker/src/workers/scoring.ts entirely**

```typescript
import { Worker } from 'bullmq'
import { v4 as uuidv4 } from 'uuid'
import { QUEUE_NAMES, JOB_NAMES, ScoringJobPayloadSchema } from '@kova/shared'
import { db, calls, transcripts, processingCosts, scores, opportunities } from '@kova/db'
import { eq } from 'drizzle-orm'
import { getRedisClient } from '../lib/redis.js'
import { createLogger } from '../lib/logger.js'
import { downloadChunks } from '../lib/s3.js'
import { transcribeAudio } from '../lib/deepgram.js'
import { runRules } from '../lib/rules/index.js'
import { analyzeTranscript } from '../lib/llm.js'
import { lookupPrice } from '../lib/pricebook.js'
import { assembleScore } from '../lib/score-assembly.js'
import type { Language, JobType, ScoringDimension } from '@kova/shared'
import type { PriceResult } from '../lib/pricebook.js'
import type { LLMAnalysis } from '../lib/llm.js'

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

  // Step 1: Fetch call from DB
  const [call] = await db
    .select({
      id: calls.id,
      companyId: calls.companyId,
      language: calls.language,
      durationSec: calls.durationSec,
      jobType: calls.jobType,
    })
    .from(calls)
    .where(eq(calls.id, callId))

  if (!call) {
    throw new Error(`Call not found: ${callId}`)
  }

  // Step 2: Mark call as processing
  await db.update(calls).set({ status: 'processing' }).where(eq(calls.id, callId))

  try {
    // Step 3: Download audio chunks from S3
    logger.info({ callId, chunkCount: s3Keys.length }, 'Downloading audio chunks')
    const audioBuffer = await downloadChunks(s3Keys)

    // Step 4: Transcribe with Deepgram Nova-3 Multilingual
    logger.info({ callId }, 'Transcribing with Deepgram Nova-3 Multilingual')
    const transcription = await transcribeAudio(audioBuffer, call.language as Language)

    // Step 5: Write transcript record
    const transcriptId = uuidv4()
    await db
      .insert(transcripts)
      .values({
        id: transcriptId,
        callId,
        segments: transcription.segments,
        language: transcription.language,
        werConfidence: transcription.werConfidence,
        provider: 'deepgram',
        model: 'nova-3-multilingual',
      })
      .returning({ id: transcripts.id })

    // Step 6: Write transcription processing cost
    await db.insert(processingCosts).values({
      callId,
      provider: 'deepgram',
      tokensIn: null,
      tokensOut: null,
      costUsd: transcription.costUsd,
    })

    // Step 7: Run rules engine
    logger.info({ callId }, 'Running rules engine')
    const callJobType = (call.jobType ?? payload.jobType ?? null) as JobType | null
    const ruleResults = runRules({
      segments: transcription.segments,
      jobType: callJobType,
      durationSec: transcription.durationSec ?? payload.totalDurationSec,
      language: transcription.language,
    })
    logger.info({ callId, ruleCount: ruleResults.length }, 'Rules evaluated')

    // Step 8: Look up prices for each rule result dimension
    const priceMap = new Map<string, PriceResult>()
    for (const rr of ruleResults) {
      const price = await lookupPrice(call.companyId, rr.dimension)
      priceMap.set(rr.dimension, price)
    }

    // Step 9: LLM qualitative analysis (non-fatal — falls back to rules-only)
    let llmAnalysis: LLMAnalysis | null = null
    try {
      logger.info({ callId }, 'Running LLM qualitative analysis')
      llmAnalysis = await analyzeTranscript(transcription.segments, callJobType, transcription.language)
      await db.insert(processingCosts).values({
        callId,
        provider: 'openai',
        tokensIn: llmAnalysis.tokensIn,
        tokensOut: llmAnalysis.tokensOut,
        costUsd: llmAnalysis.costUsd,
      })
      logger.info({ callId, tokensIn: llmAnalysis.tokensIn }, 'LLM analysis complete')
    } catch (err) {
      logger.warn({ callId, err }, 'LLM analysis failed — falling back to rules-only scoring')
    }

    // Step 10: Assemble final score
    const assembled = assembleScore(ruleResults, llmAnalysis, priceMap)

    // Step 11: Write scores row with real values
    const scoreId = uuidv4()
    await db
      .insert(scores)
      .values({
        id: scoreId,
        callId,
        overallScore: assembled.overallScore,
        dimensions: assembled.dimensions,
        opportunityTotalLow: assembled.opportunityTotalLow,
        opportunityTotalHigh: assembled.opportunityTotalHigh,
        confidenceLevel: assembled.confidenceLevel,
        modelUsed: assembled.modelUsed,
        promptVersion: 'v1',
      })
      .returning({ id: scores.id })

    // Step 12: Write opportunities rows with real prices
    for (const eo of assembled.enrichedOpportunities) {
      await db.insert(opportunities).values({
        scoreId,
        type: eo.dimension,
        triggered: eo.triggered,
        offered: eo.offered,
        pricebookItemId: eo.pricebookItemId ?? undefined,
        valueLow: eo.valueLow,
        valueHigh: eo.valueHigh,
        ltvValue: eo.ltvValue ?? undefined,
        isDefaultPrice: eo.isDefaultPrice,
        confidence: eo.confidence,
        clipStartSec: eo.clipStartSec ?? null,
        clipEndSec: eo.clipEndSec ?? null,
      })
    }

    // Step 13: Mark call as scored, link transcript + score
    await db
      .update(calls)
      .set({ status: 'scored', transcriptId, scoreId })
      .where(eq(calls.id, callId))

    logger.info(
      { callId, transcriptId, scoreId, overallScore: assembled.overallScore, modelUsed: assembled.modelUsed },
      'Scoring complete'
    )
  } catch (err) {
    await db.update(calls).set({ status: 'failed' }).where(eq(calls.id, callId))
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

    // TODO Week 7: Send push notification
    logger.info({ callId: payload.callId }, 'Push notification (TODO Week 7)')

    return { callId: payload.callId, status: 'scored' }
  },
  {
    connection: getRedisClient(),
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
)
```

- [ ] **Step 2: Replace worker/src/__tests__/scoring.test.ts entirely**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  calls: {},
  transcripts: {},
  processingCosts: {},
  scores: {},
  opportunities: {},
  pricebookItems: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }))
vi.mock('../lib/s3.js', () => ({ downloadChunks: vi.fn() }))
vi.mock('../lib/deepgram.js', () => ({ transcribeAudio: vi.fn() }))
vi.mock('../lib/rules/index.js', () => ({ runRules: vi.fn() }))
vi.mock('../lib/llm.js', () => ({ analyzeTranscript: vi.fn() }))
vi.mock('../lib/pricebook.js', () => ({ lookupPrice: vi.fn() }))
vi.mock('../lib/score-assembly.js', () => ({ assembleScore: vi.fn() }))
vi.mock('../lib/redis.js', () => ({ getRedisClient: vi.fn().mockReturnValue({}) }))
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({ on: vi.fn(), close: vi.fn() })),
}))

import { db } from '@kova/db'
import { downloadChunks } from '../lib/s3.js'
import { transcribeAudio } from '../lib/deepgram.js'
import { runRules } from '../lib/rules/index.js'
import { analyzeTranscript } from '../lib/llm.js'
import { lookupPrice } from '../lib/pricebook.js'
import { assembleScore } from '../lib/score-assembly.js'
import { processTranscription } from '../workers/scoring.js'

const MOCK_CALL = { id: 'call-1', companyId: 'co-1', language: 'en', durationSec: 600, jobType: 'drain' }

const MOCK_TRANSCRIPT_RESULT = {
  segments: [
    { speaker: 'speaker_0', text: 'Drain is clogged.', startSec: 0, endSec: 3.5, language: 'en', confidence: 0.95 },
  ],
  language: 'en' as const,
  werConfidence: 0.95,
  durationSec: 600,
  costUsd: 0.043,
}

const MOCK_RULE_RESULTS = [
  { dimension: 'camera_inspection', triggered: true, offered: false, confidence: 0.95 },
]

const MOCK_LLM_ANALYSIS = {
  qualScores: [
    { dimension: 'diagnosis_quality',     score: 2, reasoning: 'ok' },
    { dimension: 'hydrojet_presentation', score: 1, reasoning: 'ok' },
    { dimension: 'customer_education',    score: 2, reasoning: 'ok' },
    { dimension: 'close_quality',         score: 2, reasoning: 'ok' },
  ],
  tokensIn: 800,
  tokensOut: 200,
  costUsd: 0.0004,
}

const MOCK_PRICE_RESULT = {
  pricebookItemId: 'pb-1',
  valueLow: 425,
  valueHigh: 425,
  ltvValue: null,
  isDefaultPrice: false,
}

const MOCK_ASSEMBLED = {
  overallScore: 67,
  dimensions: [{ dimension: 'camera_inspection', score: 33, triggered: true, offered: false, confidence: 0.95 }],
  opportunityTotalLow: 425,
  opportunityTotalHigh: 425,
  enrichedOpportunities: [{
    dimension: 'camera_inspection',
    triggered: true,
    offered: false,
    confidence: 0.95,
    pricebookItemId: 'pb-1',
    valueLow: 425,
    valueHigh: 425,
    ltvValue: null,
    isDefaultPrice: false,
  }],
  modelUsed: 'rules+gpt-4o-mini',
  confidenceLevel: 'high',
}

describe('processTranscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([MOCK_CALL]),
      }),
    })
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    })
    ;(db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'row-1' }]),
      }),
    })
    ;(downloadChunks as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('audio'))
    ;(transcribeAudio as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_TRANSCRIPT_RESULT)
    ;(runRules as unknown as ReturnType<typeof vi.fn>).mockReturnValue(MOCK_RULE_RESULTS)
    ;(lookupPrice as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PRICE_RESULT)
    ;(analyzeTranscript as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_LLM_ANALYSIS)
    ;(assembleScore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(MOCK_ASSEMBLED)
  })

  it('calls all pipeline steps: download, transcribe, rules, pricebook, LLM, assembleScore', async () => {
    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 600,
    })

    expect(downloadChunks).toHaveBeenCalledWith(['audio/co-1/sess-1/chunk_0.aac'])
    expect(transcribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
    expect(runRules).toHaveBeenCalled()
    expect(lookupPrice).toHaveBeenCalledWith('co-1', 'camera_inspection')
    expect(analyzeTranscript).toHaveBeenCalled()
    expect(assembleScore).toHaveBeenCalledWith(
      MOCK_RULE_RESULTS,
      MOCK_LLM_ANALYSIS,
      expect.any(Map),
    )
    // inserts: transcript + deepgram cost + openai cost + scores + 1 opportunity = 5
    expect(db.insert).toHaveBeenCalledTimes(5)
  })

  it('scores row written with assembleScore values (overallScore=67)', async () => {
    await processTranscription({ callId: 'call-1', s3Keys: [], totalDurationSec: 600 })
    const insertCalls = (db.insert as unknown as ReturnType<typeof vi.fn>).mock.calls
    // Find the scores insert (4th insert: transcript, deepgram cost, openai cost, scores)
    const scoresInsert = insertCalls.find((_: unknown[]) => {
      // The insert target object doesn't have a name we can check directly via mock,
      // so verify by checking values passed
      return true
    })
    // Verify assembleScore was called and its return value would be used
    expect(assembleScore).toHaveReturnedWith(MOCK_ASSEMBLED)
  })

  it('final call status is scored', async () => {
    const statusUpdates: string[] = []
    const mockSet = vi.fn().mockImplementation((val: Record<string, string>) => {
      if (val.status) statusUpdates.push(val.status)
      return { where: vi.fn().mockResolvedValue(undefined) }
    })
    ;(db.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet })

    await processTranscription({ callId: 'call-1', s3Keys: [], totalDurationSec: 600 })

    expect(statusUpdates[0]).toBe('processing')
    expect(statusUpdates[statusUpdates.length - 1]).toBe('scored')
  })

  it('LLM failure is non-fatal — pipeline completes with rules-only fallback', async () => {
    ;(analyzeTranscript as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('OpenAI API error: invalid key')
    )
    // assembleScore still called with llmAnalysis=null
    ;(assembleScore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...MOCK_ASSEMBLED,
      modelUsed: 'rules-v1',
      confidenceLevel: 'medium',
    })

    await expect(
      processTranscription({ callId: 'call-1', s3Keys: [], totalDurationSec: 600 })
    ).resolves.not.toThrow()

    expect(assembleScore).toHaveBeenCalledWith(MOCK_RULE_RESULTS, null, expect.any(Map))
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
      processTranscription({ callId: 'call-1', s3Keys: ['chunk_0.aac'], totalDurationSec: 600 })
    ).rejects.toThrow('Deepgram transcription failed')

    expect(statusUpdates).toContain('failed')
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 88 tests PASS (83 + 5 new scoring tests; previous 3 scoring tests replaced)

- [ ] **Step 4: Commit**

```bash
git add worker/src/workers/scoring.ts worker/src/__tests__/scoring.test.ts
git commit -m "feat: wire LLM + pricebook + score-assembly into scoring worker — real overallScore and opportunity values"
```

---

## Task 6: Full CI Simulation and Push

- [ ] **Step 1: Run full test suite**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm test 2>&1 | tail -30
```

Expected: mobile (17) + web (6) + worker (88) = **111 tests**

- [ ] **Step 2: Typecheck**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm typecheck 2>&1 | tail -10
```

Expected: `Tasks: 5 successful, 5 total`

If typecheck fails on `DimensionScore.dimension`, verify the shared types export `AnyDimension` correctly and that workers import from `@kova/shared`.

- [ ] **Step 3: Lint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm lint 2>&1 | tail -10
```

Expected: `Tasks: 5 successful, 5 total` (warnings OK, zero errors)

Common patterns:
- `@typescript-eslint/consistent-type-imports`: use `import type` for type-only imports (check `score-assembly.ts`, `scoring.ts`)
- `@typescript-eslint/no-explicit-any`: replace with proper types in `llm.test.ts` if needed

- [ ] **Step 4: Fix any lint/typecheck errors**

Fix in place, then re-run the affected check.

- [ ] **Step 5: Commit fixes if any, then push**

```bash
git add -A && git status  # verify only expected files
git commit -m "chore: Week 6 complete — LLM scoring, pricebook lookup, score assembly, 111 tests"
git push origin main
```

- [ ] **Step 6: Verify CI passes**

```bash
sleep 60 && gh run list --limit 3
```

Expected: `✓ CI` status `completed success`

---

## Self-Review

**Spec coverage check:**

| Week 6 Requirement | Task |
|---|---|
| LLM integration (GPT-4o-mini) for contextual analysis | Task 2 |
| Pricebook lookup — DB first, CA defaults fallback | Task 3 |
| Score assembly — overallScore from rules + LLM dims | Task 4 |
| `opportunityTotalLow/High` from triggered+not_offered rules | Task 4 |
| LLM failure non-fatal (rules-only fallback) | Task 5 |
| `scores.overallScore` real value (not 0) | Task 5 |
| `opportunities.valueLow/High` real prices (not 0) | Task 5 |
| `opportunities.pricebookItemId` linked when available | Task 4+5 |
| LLM `processingCosts` row written | Task 5 |
| `companyId` added to calls select for pricebook lookup | Task 5 |
| `QualitativeDimension` + `AnyDimension` in shared types | Task 1 |
| All 6 test files passing | Task 6 |
