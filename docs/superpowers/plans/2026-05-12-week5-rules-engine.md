# Week 5 — Rules Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The rules layer runs deterministically on `TranscriptSegment[]` and correctly detects `camera_inspection` and `preventive_plan` opportunity types (Phase 1 rules), writing `RuleResult[]` to the `scores` + `opportunities` tables and advancing call status `transcribed → scored`.

**Architecture:** A `ScoringRule` interface lives in `worker/src/lib/rules/types.ts`. Two concrete rules (`CameraInspectionRule`, `MaintenancePlanRule`) live in `worker/src/lib/rules/`. A `runRules` function in `worker/src/lib/rules/index.ts` accepts segments + jobType and returns `RuleResult[]`. The scoring worker calls `runRules` after transcription, writes a `scores` row + N `opportunities` rows, and advances call status to `scored`. Contextual suppression (emergency/distress signals) and short-call handling (< 8 min → no time-sensitive dimensions) are enforced by `runRules` before calling individual rules.

**Tech Stack:** Vitest 2 (TDD), Drizzle ORM, `@kova/db`, `@kova/shared` — no new packages required.

---

## Key Context (read before any task)

- `worker/` is ESM (`"type": "module"`). All imports use `.js` extensions.
- `TranscriptSegment` shape: `{ speaker, text, startSec, endSec, language, confidence }` (from `@kova/shared`).
- `ScoringDimension` union: `'drain_cleaning_upsell' | 'hydro_jetting' | 'camera_inspection' | 'grease_trap' | 'preventive_plan' | 'pipe_repair' | 'water_heater' | 'fixture_upgrade' | 'water_filtration' | 'pressure_regulator' | 'whole_home_repiping'` (from `@kova/shared`).
- Vitest mock pattern: `vi.mock()` before imports; `as unknown as ReturnType<typeof vi.fn>` cast; `let` variable for mock refs in `beforeEach`.
- `db.insert` mock: `.values().returning()` chain (see `scoring.test.ts` for pattern).
- Emergency/distress suppression phrases: `['emergency', 'urgent', 'flooding', 'burst', 'sewage backup', 'emergencia', 'urgente', 'inundación', 'tubería rota']`.
- Short call threshold: < 480 seconds (8 minutes) — suppress `camera_inspection` and `preventive_plan` (time-sensitive requires full conversation).
- `scores` table: insert a row with `overallScore = 0`, `dimensions = []`, `confidenceLevel = 'high'`, `modelUsed = 'rules-v1'`, `promptVersion = 'v1'`. Week 6 will overwrite this.
- `opportunities` table: one row per triggered rule result.
- Call status after rules: `transcribed → scored` (even though LLM hasn't run yet — LLM will overwrite in Week 6).

---

## File Map

```
packages/shared/src/types.ts             MODIFY  — add RuleResult interface
worker/src/lib/rules/types.ts            CREATE  — ScoringRule interface
worker/src/lib/rules/camera-inspection.ts  CREATE  — CameraInspectionRule
worker/src/lib/rules/maintenance-plan.ts   CREATE  — MaintenancePlanRule
worker/src/lib/rules/index.ts            CREATE  — runRules() function + suppression logic
worker/src/__tests__/rules/camera-inspection.test.ts  CREATE  — 20 scenarios
worker/src/__tests__/rules/maintenance-plan.test.ts   CREATE  — 20 scenarios
worker/src/__tests__/rules/index.test.ts              CREATE  — suppression + short-call tests
worker/src/workers/scoring.ts            MODIFY  — call runRules, write scores + opportunities
worker/src/__tests__/scoring.test.ts     MODIFY  — add rules integration assertions
```

---

## Task 1: Add RuleResult to Shared Types

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Add RuleResult interface**

In `packages/shared/src/types.ts`, after the `DimensionScore` interface (line 109), add:

```typescript
// ---- Rules Engine -----------------------------------------------------------

export interface RuleResult {
  dimension: ScoringDimension
  triggered: boolean         // signal detected in the transcript
  offered: boolean           // tech explicitly offered the upsell
  confidence: number         // 0–1; rules are deterministic so always 0.95 unless suppressed
  clipStartSec?: number      // start of the relevant segment
  clipEndSec?: number        // end of the relevant segment
  suppressedReason?: 'emergency' | 'short_call'
}
```

- [ ] **Step 2: Typecheck shared**

```bash
pnpm --filter @kova/shared typecheck
```

Expected: passes

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat: add RuleResult type to shared"
```

---

## Task 2: ScoringRule Interface + Rules Directory

**Files:**
- Create: `worker/src/lib/rules/types.ts`

- [ ] **Step 1: Create rules directory and types file**

```bash
mkdir -p worker/src/lib/rules
mkdir -p worker/src/__tests__/rules
```

Create `worker/src/lib/rules/types.ts`:

```typescript
import type { TranscriptSegment, RuleResult, ScoringDimension, JobType } from '@kova/shared'

export interface RuleContext {
  segments: TranscriptSegment[]
  jobType: JobType | null
  durationSec: number
  language: 'en' | 'es' | 'unknown'
}

export interface ScoringRule {
  dimension: ScoringDimension
  /** Returns null if this rule does not apply to the given jobType */
  evaluate(ctx: RuleContext): RuleResult | null
}
```

- [ ] **Step 2: Typecheck worker**

```bash
pnpm --filter @kova/worker typecheck
```

Expected: passes

- [ ] **Step 3: Commit**

```bash
git add worker/src/lib/rules/types.ts
git commit -m "feat: ScoringRule interface and RuleContext type"
```

---

## Task 3: CameraInspectionRule (TDD — 20 scenarios)

Trigger signals: recurrence keywords, older-home keywords, prior-visit keywords. Offer detection: tech explicitly names camera inspection / camera scope / video inspection. Only applies to drain + both job types.

**Files:**
- Create: `worker/src/__tests__/rules/camera-inspection.test.ts`
- Create: `worker/src/lib/rules/camera-inspection.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/camera-inspection.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { CameraInspectionRule } from '../../lib/rules/camera-inspection.js'
import type { RuleContext } from '../../lib/rules/types.js'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): import('@kova/shared').TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: import('@kova/shared').TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new CameraInspectionRule()

describe('CameraInspectionRule', () => {
  // --- Trigger + Offer -------------------------------------------------------

  it('1. EN: recurrence signal + offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening every few months'),
      seg('speaker_0', 'We should do a camera inspection to see what is going on'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: prior visit signal + camera scope → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We had someone out for this before'),
      seg('speaker_0', 'I recommend running a camera scope on your line'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: older home signal + video inspection → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The house was built in 1965'),
      seg('speaker_0', 'Let me do a video inspection of your pipes'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  // --- Trigger without Offer (missed opportunity) ----------------------------

  it('4. EN: recurrence signal, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'It backs up about twice a year'),
      seg('speaker_0', 'I will snake it out for you today'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('5. EN: "third time this year" signal, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is the third time this year I have called'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('6. EN: prior service signal only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Prior service was done on this drain six months ago'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  // --- No trigger, no offer --------------------------------------------------

  it('7. EN: no signals, no offer → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The sink is slow today'),
      seg('speaker_0', 'I can clear this right now'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('8. EN: offer with no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Just a little slow'),
      seg('speaker_0', 'Would you like a camera inspection while I am here?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  // --- Spanish scenarios ------------------------------------------------------

  it('9. ES: recurrence signal + offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Esto pasa cada pocos meses', 0, 4),
      seg('speaker_0', 'Le recomiendo una inspección con cámara', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. ES: prior visit signal ("antes") + camera offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Ya vinieron antes por esto mismo'),
      seg('speaker_0', 'Vamos a hacer una cámara de video para inspeccionar'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('11. ES: recurrence signal, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Esto pasa repetidamente'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. ES: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El drenaje está un poco lento hoy'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  // --- Job type gating --------------------------------------------------------

  it('13. jobType=plumbing → returns null (not applicable)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('14. jobType=both + recurrence → triggered=true (applies to both)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening every year'),
      seg('speaker_0', 'I recommend a camera inspection'),
    ], { jobType: 'both' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. jobType=null → applies (treat as unknown, run the rule)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
    ], { jobType: null }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  // --- Clip timestamps --------------------------------------------------------

  it('16. clipStartSec set to the first trigger segment start', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 30, 35),
      seg('speaker_0', 'We should do a camera inspection', 36, 40),
    ]))
    expect(result?.clipStartSec).toBe(30)
    expect(result?.clipEndSec).toBe(40)
  })

  // --- Mixed language (bilingual call) ----------------------------------------

  it('17. EN trigger in ES call → triggered=true (keyword matching is language-agnostic)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 0, 3),
      seg('speaker_0', 'El drenaje está bien', 4, 7),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
  })

  // --- Offer keyword variants -------------------------------------------------

  it('18. "run a camera" offer phrase → offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Had someone out last year'),
      seg('speaker_0', 'Let me run a camera down that line'),
    ]))
    expect(result?.offered).toBe(true)
  })

  it('19. "scope the line" offer phrase → offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Prior service was done here'),
      seg('speaker_0', 'I want to scope the line to find the issue'),
    ]))
    expect(result?.offered).toBe(true)
  })

  it('20. Partial word "camer" does NOT match (avoid false positives on partial words)', () => {
    // "camer" alone should not trigger the offer phrase
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
      seg('speaker_0', 'The camer is not needed today'),
    ]))
    expect(result?.offered).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/camera-inspection.js'"

- [ ] **Step 3: Create worker/src/lib/rules/camera-inspection.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

// ---------------------------------------------------------------------------
// Trigger keywords (case-insensitive)
// ---------------------------------------------------------------------------

const TRIGGER_PHRASES_EN = [
  'keeps happening', 'keeps coming back', 'again', 'recurring', 'recurrence',
  'third time', 'second time', 'every year', 'every few months', 'twice a year',
  'prior service', 'prior visit', 'had someone out', 'been out before',
  'before for this', 'already been here', 'house was built',
  'older home', 'old pipes', 'old house', 'built in 19',
]

const TRIGGER_PHRASES_ES = [
  'pasa cada', 'pasa repetidamente', 'sigue pasando', 'vuelve a pasar',
  'otra vez', 'de nuevo', 'ya vinieron', 'ya estuvieron', 'antes por esto',
  'servicio previo', 'visita previa', 'la casa tiene', 'tubería vieja',
  'casa antigua', 'construida en 19',
]

// ---------------------------------------------------------------------------
// Offer keywords (case-insensitive; match as whole words / substrings)
// ---------------------------------------------------------------------------

const OFFER_PHRASES_EN = [
  'camera inspection', 'camera scope', 'video inspection',
  'run a camera', 'run the camera', 'scope the line',
  'camera down', 'send a camera',
]

const OFFER_PHRASES_ES = [
  'inspección con cámara', 'inspección de cámara', 'cámara de video',
  'cámara en la tubería', 'hacer una cámara', 'pasar la cámara',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase()
  return phrases.some((p) => lower.includes(p))
}

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

export class CameraInspectionRule implements ScoringRule {
  dimension = 'camera_inspection' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    // Only applies to drain and both job types
    if (ctx.jobType === 'plumbing') return null

    const allTriggers = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
    const allOffers = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, allTriggers)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      if (!offered && matchesAny(text, allOffers)) {
        offered = true
        clipEndSec = seg.endSec
        if (clipStartSec === undefined) clipStartSec = seg.startSec
      }
    }

    // If only offer was found (no trigger), still record it
    if (!triggered && !offered) {
      return { dimension: this.dimension, triggered: false, offered: false, confidence: 0.95 }
    }

    return {
      dimension: this.dimension,
      triggered,
      offered,
      confidence: 0.95,
      clipStartSec,
      clipEndSec,
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @kova/worker test 2>&1 | tail -12
```

Expected: 37 tests PASS (17 previous + 20 camera inspection)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/camera-inspection.ts worker/src/__tests__/rules/camera-inspection.test.ts
git commit -m "feat: CameraInspectionRule — EN + ES keyword detection with 20 test scenarios"
```

---

## Task 4: MaintenancePlanRule (TDD — 20 scenarios)

Trigger: customer expresses recurrence concern, tech closes without offering plan. Offer detection: maintenance plan / service agreement / service plan / preventive plan offered at close. Only applies to drain + both job types. Close-window detection: offer must appear in the last 40% of the call by duration.

**Files:**
- Create: `worker/src/__tests__/rules/maintenance-plan.test.ts`
- Create: `worker/src/lib/rules/maintenance-plan.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/maintenance-plan.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { MaintenancePlanRule } from '../../lib/rules/maintenance-plan.js'
import type { RuleContext } from '../../lib/rules/types.js'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): import('@kova/shared').TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: import('@kova/shared').TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new MaintenancePlanRule()

describe('MaintenancePlanRule', () => {
  // --- Trigger + Offer -------------------------------------------------------

  it('1. EN: recurrence concern + maintenance plan offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This drain keeps backing up', 0, 4),
      seg('speaker_0', 'Let me tell you about our maintenance plan', 520, 525),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('2. EN: recurrence concern + service agreement → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'It backs up about twice a year', 0, 5),
      seg('speaker_0', 'We offer a service agreement that covers annual cleanings', 510, 516),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: recurrence concern + preventive plan → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Every year this happens', 0, 3),
      seg('speaker_0', 'You would benefit from our preventive plan', 580, 585),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  // --- Trigger without Offer (missed) ----------------------------------------

  it('4. EN: recurrence concern, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening every year', 0, 4),
      seg('speaker_0', 'I will clear it out for you today', 5, 9),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('5. EN: "same problem again" concern, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'It is the same problem again'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('6. EN: offer made too early (not in close window) → offered=false', () => {
    // Offer at 5s in a 600s call is NOT in the close window (last 40% = from 360s)
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 0, 4),
      seg('speaker_0', 'We have a maintenance plan available', 5, 9),
      seg('speaker_0', 'All done today', 590, 595),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  // --- No trigger, no offer --------------------------------------------------

  it('7. EN: no signals, no offer → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The sink is slow today'),
      seg('speaker_0', 'All cleared out, have a good day'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('8. EN: offer only (no trigger) → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'First time this happened'),
      seg('speaker_0', 'Would you like to hear about our maintenance plan?', 580, 585),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  // --- Spanish scenarios ------------------------------------------------------

  it('9. ES: recurrence concern + plan offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Esto pasa cada año', 0, 4),
      seg('speaker_0', 'Le puedo ofrecer nuestro plan de mantenimiento', 520, 526),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. ES: "el mismo problema otra vez" + acuerdo de servicio → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Es el mismo problema otra vez', 0, 4),
      seg('speaker_0', 'Tenemos un acuerdo de servicio anual disponible', 510, 517),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('11. ES: recurrence concern, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Esto siempre pasa'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. ES: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El drenaje estaba lento hoy'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  // --- Job type gating --------------------------------------------------------

  it('13. jobType=plumbing → returns null (not applicable to plumbing — service_agreement handled separately in Week 5+)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('14. jobType=both + trigger → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
      seg('speaker_0', 'We have a maintenance plan for that', 520, 525),
    ], { jobType: 'both' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. jobType=null → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
    ], { jobType: null }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  // --- Close window boundary -------------------------------------------------

  it('16. offer exactly at 60% through call → offered=true (boundary: last 40%)', () => {
    // 60% of 600s = 360s — exactly at the start of the close window
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 0, 4),
      seg('speaker_0', 'Let me tell you about our maintenance plan', 360, 365),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('17. offer at 59% through call → offered=false (just outside window)', () => {
    // 59% of 600s = 354s — just before the close window
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 0, 4),
      seg('speaker_0', 'Let me mention the maintenance plan', 354, 359),
      seg('speaker_0', 'All done', 595, 600),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  // --- Offer phrase variants --------------------------------------------------

  it('18. "service plan" offer phrase → offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This happens twice a year', 0, 4),
      seg('speaker_0', 'We have a service plan that would prevent this', 500, 506),
    ]))
    expect(result?.offered).toBe(true)
  })

  it('19. "annual service" offer phrase → offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Again with this problem', 0, 4),
      seg('speaker_0', 'Would you like our annual service?', 510, 515),
    ]))
    expect(result?.offered).toBe(true)
  })

  // --- Clip timestamps --------------------------------------------------------

  it('20. clipStartSec set to first trigger, clipEndSec to last offer segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 30, 35),
      seg('speaker_0', 'We offer a maintenance plan', 520, 525),
    ]))
    expect(result?.clipStartSec).toBe(30)
    expect(result?.clipEndSec).toBe(525)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/maintenance-plan.js'"

- [ ] **Step 3: Create worker/src/lib/rules/maintenance-plan.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

// ---------------------------------------------------------------------------
// Trigger keywords (recurrence concern from customer)
// ---------------------------------------------------------------------------

const TRIGGER_PHRASES_EN = [
  'keeps happening', 'keeps coming back', 'again', 'recurring', 'same problem',
  'every year', 'every few months', 'twice a year', 'once a year',
  'third time', 'second time', 'all the time',
]

const TRIGGER_PHRASES_ES = [
  'siempre pasa', 'sigue pasando', 'otra vez', 'mismo problema',
  'cada año', 'cada pocos meses', 'dos veces al año', 'de nuevo',
  'todo el tiempo', 'la misma situación',
]

// ---------------------------------------------------------------------------
// Offer keywords (tech offers a plan — must appear in close window)
// ---------------------------------------------------------------------------

const OFFER_PHRASES_EN = [
  'maintenance plan', 'service agreement', 'service plan',
  'preventive plan', 'preventive maintenance', 'annual service',
  'annual cleaning', 'club membership', 'protection plan',
]

const OFFER_PHRASES_ES = [
  'plan de mantenimiento', 'acuerdo de servicio', 'plan de servicio',
  'mantenimiento preventivo', 'plan preventivo', 'servicio anual',
  'limpieza anual', 'membresía', 'plan de protección',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase()
  return phrases.some((p) => lower.includes(p))
}

/** Close window: last 40% of call duration */
function isInCloseWindow(segStartSec: number, durationSec: number): boolean {
  return segStartSec >= durationSec * 0.6
}

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

export class MaintenancePlanRule implements ScoringRule {
  dimension = 'preventive_plan' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    // Only applies to drain and both job types
    if (ctx.jobType === 'plumbing') return null

    const allTriggers = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
    const allOffers = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, allTriggers)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      // Offer must be in the close window (last 40% of call)
      if (
        !offered &&
        matchesAny(text, allOffers) &&
        isInCloseWindow(seg.startSec, ctx.durationSec)
      ) {
        offered = true
        clipEndSec = seg.endSec
        if (clipStartSec === undefined) clipStartSec = seg.startSec
      }
    }

    return {
      dimension: this.dimension,
      triggered,
      offered,
      confidence: 0.95,
      clipStartSec,
      clipEndSec,
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @kova/worker test 2>&1 | tail -12
```

Expected: 57 tests PASS (17 + 20 camera + 20 maintenance)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/maintenance-plan.ts worker/src/__tests__/rules/maintenance-plan.test.ts
git commit -m "feat: MaintenancePlanRule — EN + ES with close-window detection and 20 test scenarios"
```

---

## Task 5: runRules() + Contextual Suppression (TDD)

`runRules` orchestrates all rules, applies emergency/distress suppression, applies short-call suppression, and returns `RuleResult[]`.

**Files:**
- Create: `worker/src/lib/rules/index.ts`
- Create: `worker/src/__tests__/rules/index.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { runRules } from '../../lib/rules/index.js'
import type { RuleContext } from '../../lib/rules/types.js'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): import('@kova/shared').TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

describe('runRules', () => {
  it('returns results for both rules on a standard drain call', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'This keeps happening every year', 0, 4),
        seg('speaker_0', 'I recommend a camera inspection', 5, 10),
        seg('speaker_0', 'We have a maintenance plan available', 520, 526),
      ],
      jobType: 'drain',
      durationSec: 600,
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results).toHaveLength(2)
    const camera = results.find((r) => r.dimension === 'camera_inspection')
    const plan = results.find((r) => r.dimension === 'preventive_plan')
    expect(camera?.triggered).toBe(true)
    expect(camera?.offered).toBe(true)
    expect(plan?.triggered).toBe(true)
    expect(plan?.offered).toBe(true)
  })

  it('returns null-filtered results for plumbing (both rules return null)', () => {
    const ctx: RuleContext = {
      segments: [seg('speaker_1', 'The water heater is old')],
      jobType: 'plumbing',
      durationSec: 600,
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results).toHaveLength(0)
  })

  it('applies emergency suppression — all results marked suppressedReason=emergency', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'We have a flooding emergency right now', 0, 4),
        seg('speaker_1', 'This keeps happening every year', 5, 9),
        seg('speaker_0', 'I recommend a camera inspection', 10, 14),
      ],
      jobType: 'drain',
      durationSec: 600,
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results.every((r) => r.suppressedReason === 'emergency')).toBe(true)
    expect(results.every((r) => r.triggered === false)).toBe(true)
    expect(results.every((r) => r.offered === false)).toBe(true)
  })

  it('applies ES emergency suppression (emergencia)', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'Es una emergencia, hay agua por todos lados', 0, 5),
      ],
      jobType: 'drain',
      durationSec: 600,
      language: 'es',
    }
    const results = runRules(ctx)
    expect(results.every((r) => r.suppressedReason === 'emergency')).toBe(true)
  })

  it('applies short-call suppression — results marked suppressedReason=short_call when < 8 min', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'This keeps happening', 0, 4),
        seg('speaker_0', 'Camera inspection recommended', 5, 9),
      ],
      jobType: 'drain',
      durationSec: 400, // < 480s threshold
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results.every((r) => r.suppressedReason === 'short_call')).toBe(true)
  })

  it('does NOT suppress calls at exactly 480 seconds', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'This keeps happening', 0, 4),
      ],
      jobType: 'drain',
      durationSec: 480,
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results.every((r) => r.suppressedReason === undefined)).toBe(true)
  })

  it('emergency suppression takes priority over short-call suppression', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'flooding emergency', 0, 3),
      ],
      jobType: 'drain',
      durationSec: 300,
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results.every((r) => r.suppressedReason === 'emergency')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/index.js'"

- [ ] **Step 3: Create worker/src/lib/rules/index.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { RuleContext, ScoringRule } from './types.js'
import { CameraInspectionRule } from './camera-inspection.js'
import { MaintenancePlanRule } from './maintenance-plan.js'

// ---------------------------------------------------------------------------
// Rule registry
// ---------------------------------------------------------------------------

const RULES: ScoringRule[] = [
  new CameraInspectionRule(),
  new MaintenancePlanRule(),
]

// ---------------------------------------------------------------------------
// Suppression signals
// ---------------------------------------------------------------------------

const EMERGENCY_PHRASES = [
  'emergency', 'urgent', 'flooding', 'burst', 'sewage backup',
  'emergencia', 'urgente', 'inundación', 'tubería rota',
]

function hasEmergencySignal(ctx: RuleContext): boolean {
  const lower = ctx.segments.map((s) => s.text.toLowerCase()).join(' ')
  return EMERGENCY_PHRASES.some((p) => lower.includes(p))
}

const SHORT_CALL_THRESHOLD_SEC = 480 // 8 minutes

// ---------------------------------------------------------------------------
// runRules
// ---------------------------------------------------------------------------

/**
 * Run all scoring rules against the transcript context.
 * Returns RuleResult[] — null results (rule not applicable) are filtered out.
 * Applies contextual suppression before evaluating individual rules.
 */
export function runRules(ctx: RuleContext): RuleResult[] {
  const suppressedReason: 'emergency' | 'short_call' | undefined =
    hasEmergencySignal(ctx)
      ? 'emergency'
      : ctx.durationSec < SHORT_CALL_THRESHOLD_SEC
        ? 'short_call'
        : undefined

  return RULES.flatMap((rule): RuleResult[] => {
    const result = rule.evaluate(ctx)
    if (result === null) return []

    if (suppressedReason) {
      return [{
        dimension: result.dimension,
        triggered: false,
        offered: false,
        confidence: 0.95,
        suppressedReason,
      }]
    }

    return [result]
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @kova/worker test 2>&1 | tail -12
```

Expected: 63 tests PASS (17 + 20 + 20 + 6)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/index.ts worker/src/__tests__/rules/index.test.ts
git commit -m "feat: runRules() with emergency + short-call suppression"
```

---

## Task 6: Wire Rules into Scoring Worker

Extend `processTranscription` in `scoring.ts` to run rules after transcription, write a `scores` row + `opportunities` rows, and advance status to `scored`.

**Files:**
- Modify: `worker/src/workers/scoring.ts`
- Modify: `worker/src/__tests__/scoring.test.ts`

- [ ] **Step 1: Update scoring.ts**

Replace `worker/src/workers/scoring.ts` entirely:

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
import type { Language, JobType } from '@kova/shared'

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

  // Step 1: Fetch call from DB to get language hint and jobType
  const [call] = await db
    .select({
      id: calls.id,
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
    const ruleResults = runRules({
      segments: transcription.segments,
      jobType: (call.jobType ?? payload.jobType ?? null) as JobType | null,
      durationSec: transcription.durationSec || payload.totalDurationSec,
      language: transcription.language,
    })
    logger.info({ callId, ruleCount: ruleResults.length }, 'Rules evaluated')

    // Step 8: Write scores row (rules-only pass; LLM overwrites in Week 6)
    const scoreId = uuidv4()
    await db
      .insert(scores)
      .values({
        id: scoreId,
        callId,
        overallScore: 0,
        dimensions: [],
        opportunityTotalLow: 0,
        opportunityTotalHigh: 0,
        confidenceLevel: 'high',
        modelUsed: 'rules-v1',
        promptVersion: 'v1',
      })
      .returning({ id: scores.id })

    // Step 9: Write opportunities rows (one per triggered rule result)
    for (const rr of ruleResults) {
      await db.insert(opportunities).values({
        scoreId,
        type: rr.dimension,
        triggered: rr.triggered,
        offered: rr.offered,
        valueLow: 0,
        valueHigh: 0,
        isDefaultPrice: true,
        confidence: rr.confidence,
        clipStartSec: rr.clipStartSec ?? null,
        clipEndSec: rr.clipEndSec ?? null,
      })
    }

    // Step 10: Mark call as transcribed → scored, link transcript + score
    await db
      .update(calls)
      .set({ status: 'scored', transcriptId, scoreId })
      .where(eq(calls.id, callId))

    logger.info(
      { callId, transcriptId, scoreId, language: transcription.language },
      'Scoring complete (rules pass)'
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

    // TODO Week 6: LLM scoring + score assembly + pricebook lookup
    logger.info({ callId: payload.callId }, 'LLM scoring (TODO Week 6)')

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

- [ ] **Step 2: Update scoring.test.ts to assert rules integration**

Replace `worker/src/__tests__/scoring.test.ts` entirely:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kova/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  calls: {},
  transcripts: {},
  processingCosts: {},
  scores: {},
  opportunities: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))
vi.mock('../lib/s3.js', () => ({ downloadChunks: vi.fn() }))
vi.mock('../lib/deepgram.js', () => ({ transcribeAudio: vi.fn() }))
vi.mock('../lib/rules/index.js', () => ({ runRules: vi.fn() }))
vi.mock('../lib/redis.js', () => ({ getRedisClient: vi.fn().mockReturnValue({}) }))
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({ on: vi.fn(), close: vi.fn() })),
}))

import { db } from '@kova/db'
import { downloadChunks } from '../lib/s3.js'
import { transcribeAudio } from '../lib/deepgram.js'
import { runRules } from '../lib/rules/index.js'
import { processTranscription } from '../workers/scoring.js'

const MOCK_CALL = { id: 'call-1', language: 'en', durationSec: 300, jobType: 'drain' }

const MOCK_TRANSCRIPT_RESULT = {
  segments: [
    { speaker: 'speaker_0', text: 'Drain is clogged.', startSec: 0, endSec: 3.5, language: 'en', confidence: 0.95 },
  ],
  language: 'en' as const,
  werConfidence: 0.95,
  durationSec: 300,
  costUsd: 0.0215,
}

const MOCK_RULE_RESULTS = [
  { dimension: 'camera_inspection', triggered: true, offered: false, confidence: 0.95 },
]

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
  })

  it('downloads audio, transcribes, runs rules, and writes transcript + score + opportunities', async () => {
    await processTranscription({
      callId: 'call-1',
      s3Keys: ['audio/co-1/sess-1/chunk_0.aac'],
      totalDurationSec: 300,
    })

    expect(downloadChunks).toHaveBeenCalledWith(['audio/co-1/sess-1/chunk_0.aac'])
    expect(transcribeAudio).toHaveBeenCalledWith(expect.any(Buffer), 'en')
    expect(runRules).toHaveBeenCalledWith(expect.objectContaining({
      segments: MOCK_TRANSCRIPT_RESULT.segments,
      jobType: 'drain',
      language: 'en',
    }))
    // transcript + processingCosts + scores + (1 opportunity per rule result)
    expect(db.insert).toHaveBeenCalledTimes(4)
  })

  it('final call status is scored', async () => {
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
    expect(statusUpdates[statusUpdates.length - 1]).toBe('scored')
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
      processTranscription({ callId: 'call-1', s3Keys: ['chunk_0.aac'], totalDurationSec: 300 })
    ).rejects.toThrow('Deepgram transcription failed')

    expect(statusUpdates).toContain('failed')
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
pnpm --filter @kova/worker test 2>&1 | tail -12
```

Expected: 66 tests PASS (3 scoring + 20 camera + 20 maintenance + 6 index + 17 previous)

- [ ] **Step 4: Commit**

```bash
git add worker/src/workers/scoring.ts worker/src/__tests__/scoring.test.ts
git commit -m "feat: wire rules engine into scoring worker — write scores + opportunities rows, advance to scored"
```

---

## Task 7: Full CI Simulation and Push

- [ ] **Step 1: Run full test suite**

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm test
```

Expected: All tests pass — mobile (17) + web (6) + worker (66) = 89 tests

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: `Tasks: 5 successful, 5 total`

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: `Tasks: 5 successful, 5 total` (warnings OK, zero errors)

- [ ] **Step 4: Fix any lint errors**

Common patterns to watch:
- `@typescript-eslint/consistent-type-imports`: use `import type` for type-only imports
- `@typescript-eslint/no-unused-vars`: prefix intentionally unused params with `_`

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "chore: Week 5 complete — rules engine, EN + ES detection, suppression, 66 worker tests"
git push origin main
```

- [ ] **Step 6: Verify CI passes**

```bash
sleep 45 && gh run list --repo kova-ai-app/kova --limit 1
```

Expected: `✓ CI` status `completed success`

---

## Self-Review

**Spec coverage check:**

| Week 5 Requirement | Task |
|---|---|
| `ScoringRule` interface | Task 2 |
| `CameraInspectionRule` EN + ES keyword detection | Task 3 |
| `MaintenancePlanRule` close-window detection, EN + ES | Task 4 |
| Emergency + distress contextual suppression | Task 5 |
| Short call handling (< 8 min → suppress time-sensitive) | Task 5 |
| Unit test suite: 20 synthetic scenarios per rule | Tasks 3, 4 |
| Rules output stored before LLM layer | Task 6 |
| `scores` row written per call | Task 6 |
| `opportunities` rows written per rule result | Task 6 |
| Call status `transcribed → scored` | Task 6 |
| `RuleResult` type with `suppressedReason` | Task 1 |
