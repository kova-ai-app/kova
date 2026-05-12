# Week 7a — Rules Backfill (9 Missing Rules)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 9 missing scoring rules (4 drain + 5 plumbing) and register them in `runRules()`, bringing total test count from 108 to 198.

**Architecture:** Each rule is an independent file in `worker/src/lib/rules/` implementing `ScoringRule`. All follow the exact `CameraInspectionRule` pattern: separate EN/ES phrase arrays merged into `ALL_TRIGGERS`/`ALL_OFFERS` at module level, language-agnostic substring matching, `confidence: 0.95` constant, `dimension = '...' as const`. Task 10 registers all 9 new rules in `index.ts`.

**Tech Stack:** Vitest 2 (TDD), TypeScript ESM (`worker/` has `"type": "module"`), `@kova/shared`, `@kova/db`.

---

## Key Context (read before any task)

- `worker/` is ESM (`"type": "module"`). All imports use `.js` extensions.
- Test helper pattern (copy verbatim from task to task, adjusting class name and default jobType):
  ```typescript
  function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
    return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
  }
  function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
    return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
  }
  ```
  For plumbing rules, change the default `jobType` to `'plumbing'` in the `ctx` helper.
- Job type gating: drain rules return `null` when `ctx.jobType === 'plumbing'`; plumbing rules return `null` when `ctx.jobType === 'drain'`. Both return non-null for `'both'` and `null` jobType.
- `confidence: 0.95` is always set — deterministic convention.
- `clipStartSec` / `clipEndSec`: set from the segment that first triggers / first offers.
- All phrase matching is case-insensitive substring match (`.toLowerCase().includes(phrase)`).
- Run `source ~/.nvm/nvm.sh && nvm use 22` before any bash command.

---

## File Map

```
worker/src/lib/rules/drain-cleaning-upsell.ts        CREATE
worker/src/lib/rules/hydro-jetting.ts                CREATE
worker/src/lib/rules/grease-trap.ts                  CREATE
worker/src/lib/rules/pipe-repair.ts                  CREATE
worker/src/lib/rules/water-heater.ts                 CREATE
worker/src/lib/rules/fixture-upgrade.ts              CREATE
worker/src/lib/rules/water-filtration.ts             CREATE
worker/src/lib/rules/pressure-regulator.ts           CREATE
worker/src/lib/rules/whole-home-repiping.ts          CREATE
worker/src/lib/rules/index.ts                        MODIFY — add 9 imports + push into RULES[]
worker/src/__tests__/rules/drain-cleaning-upsell.test.ts  CREATE (10 scenarios)
worker/src/__tests__/rules/hydro-jetting.test.ts          CREATE (10 scenarios)
worker/src/__tests__/rules/grease-trap.test.ts            CREATE (10 scenarios)
worker/src/__tests__/rules/pipe-repair.test.ts            CREATE (10 scenarios)
worker/src/__tests__/rules/water-heater.test.ts           CREATE (10 scenarios)
worker/src/__tests__/rules/fixture-upgrade.test.ts        CREATE (10 scenarios)
worker/src/__tests__/rules/water-filtration.test.ts       CREATE (10 scenarios)
worker/src/__tests__/rules/pressure-regulator.test.ts     CREATE (10 scenarios)
worker/src/__tests__/rules/whole-home-repiping.test.ts    CREATE (10 scenarios)
```

---

## Task 1: DrainCleaningUpsellRule

**Files:**
- Create: `worker/src/__tests__/rules/drain-cleaning-upsell.test.ts`
- Create: `worker/src/lib/rules/drain-cleaning-upsell.ts`

This rule fires when a customer describes a clog/slow drain and the tech should upsell from a one-time snake to a permanent enzymatic/descaling treatment ($189–289).

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/drain-cleaning-upsell.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { DrainCleaningUpsellRule } from '../../lib/rules/drain-cleaning-upsell.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new DrainCleaningUpsellRule()

describe('DrainCleaningUpsellRule', () => {
  it('1. EN: slow drain trigger + enzyme treatment offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The drain is slow and has been slow for a while'),
      seg('speaker_0', 'I recommend an enzyme treatment to keep it clear long term'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: clogged trigger + bio-clean offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The kitchen drain is completely clogged'),
      seg('speaker_0', 'We can apply bio-clean after the snake to prevent buildup'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The bathroom drain is backing up'),
      seg('speaker_0', 'I will clear that out with the snake right now'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Would you like a drain treatment to keep everything flowing?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Everything seems fine in here'),
      seg('speaker_0', 'All good, just a routine inspection'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: trigger + offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El drenaje está muy lento y no drena bien', 0, 4),
      seg('speaker_0', 'Le recomiendo un tratamiento enzimático para limpiar la línea', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El desagüe está atascado y no pasa el agua'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=plumbing → returns null (drain rule, not applicable)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The drain is slow'),
      seg('speaker_0', 'Bio-clean will help'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger → triggered=true (applies to both)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The drain is backed up'),
      seg('speaker_0', 'I can do an enzyme treatment'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  it('10. clipStartSec set to first trigger segment start', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The drain is not draining at all', 20, 25),
      seg('speaker_0', 'I will use bio-clean after snaking', 26, 30),
    ]))
    expect(result?.clipStartSec).toBe(20)
    expect(result?.clipEndSec).toBe(30)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/drain-cleaning-upsell.js'"

- [ ] **Step 3: Create worker/src/lib/rules/drain-cleaning-upsell.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

// ---------------------------------------------------------------------------
// Trigger keywords — customer describes a clog or slow drain
// ---------------------------------------------------------------------------

const TRIGGER_PHRASES_EN = [
  'slow drain', 'drain is slow', 'draining slowly', 'clog', 'clogged',
  'backing up', 'backed up', 'not draining', 'drain backup', 'blocked drain',
  'drain is blocked', 'sink is slow',
]

const TRIGGER_PHRASES_ES = [
  'drenaje lento', 'desagüe lento', 'atascado', 'tapado',
  'no drena', 'drenaje bloqueado', 'desagüe bloqueado',
]

// ---------------------------------------------------------------------------
// Offer keywords — tech offers a permanent cleaning / treatment upgrade
// ---------------------------------------------------------------------------

const OFFER_PHRASES_EN = [
  'bio-clean', 'bio clean', 'enzyme treatment', 'drain treatment',
  'biological treatment', 'descaling', 'drain cleaning service',
  'permanent clean', 'deep clean', 'full drain cleaning',
]

const OFFER_PHRASES_ES = [
  'bio-clean', 'tratamiento enzimático', 'tratamiento de drenaje',
  'limpieza profunda', 'limpieza completa', 'servicio de limpieza de drenaje',
]

// Language-agnostic: both EN + ES always checked regardless of ctx.language
const ALL_TRIGGERS = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
const ALL_OFFERS = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

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

export class DrainCleaningUpsellRule implements ScoringRule {
  dimension = 'drain_cleaning_upsell' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    if (ctx.jobType === 'plumbing') return null

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, ALL_TRIGGERS)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      if (!offered && matchesAny(text, ALL_OFFERS)) {
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
      ...(clipStartSec !== undefined && { clipStartSec }),
      ...(clipEndSec !== undefined && { clipEndSec }),
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 118 tests PASS (108 existing + 10 new)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/drain-cleaning-upsell.ts worker/src/__tests__/rules/drain-cleaning-upsell.test.ts
git commit -m "feat: DrainCleaningUpsellRule — enzyme/bio-clean upsell detection with 10 test scenarios"
```

---

## Task 2: HydroJettingRule

**Files:**
- Create: `worker/src/__tests__/rules/hydro-jetting.test.ts`
- Create: `worker/src/lib/rules/hydro-jetting.ts`

This rule fires when grease buildup, root intrusion, or main-line severity is mentioned and the tech should offer hydro-jetting ($750–950).

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/hydro-jetting.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { HydroJettingRule } from '../../lib/rules/hydro-jetting.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new HydroJettingRule()

describe('HydroJettingRule', () => {
  it('1. EN: grease buildup trigger + hydro jet offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'There is serious grease buildup throughout the main line'),
      seg('speaker_0', 'I recommend hydro jetting to fully clear that out'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: root intrusion trigger + jet the line offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We have serious root intrusion in the sewer line'),
      seg('speaker_0', 'We can jet the line to blast those roots out'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The mainline is completely blocked with scale buildup'),
      seg('speaker_0', 'I will snake it out for now'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Would you like me to do a hydro-jetting service while I am here?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The sink is a little slow today'),
      seg('speaker_0', 'I can clear this quickly'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: grease trigger + hydro offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Hay mucha acumulación de grasa en la línea principal', 0, 4),
      seg('speaker_0', 'Le recomiendo un servicio de hidrojet para limpiar eso', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: root intrusion trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Hay una intrusión de raíces en la línea principal'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=plumbing → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Grease buildup everywhere'),
      seg('speaker_0', 'Hydro jetting will fix it'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies and triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is a commercial restaurant with severe grease buildup'),
      seg('speaker_0', 'Hydro-jetting is the right solution here'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec is set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The main line has heavy buildup from roots', 45, 50),
      seg('speaker_0', 'We should do hydro-jetting on this', 51, 55),
    ]))
    expect(result?.clipStartSec).toBe(45)
    expect(result?.clipEndSec).toBe(55)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/hydro-jetting.js'"

- [ ] **Step 3: Create worker/src/lib/rules/hydro-jetting.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'grease buildup', 'roots in the pipe', 'root intrusion', 'main line', 'mainline',
  'sewer line', 'severe clog', 'heavy buildup', 'scale buildup',
  'recurring blockage', 'hard buildup',
]

const TRIGGER_PHRASES_ES = [
  'acumulación de grasa', 'raíces en la tubería', 'intrusión de raíces',
  'línea principal', 'línea de alcantarilla', 'obstrucción severa',
  'acumulación pesada',
]

const OFFER_PHRASES_EN = [
  'hydro jet', 'hydro jetting', 'hydro-jet', 'hydro-jetting',
  'water jet', 'high-pressure jet', 'jetting service', 'jet the line',
  'high-pressure clean', 'jet cleaning',
]

const OFFER_PHRASES_ES = [
  'hidrojet', 'hidrojetting', 'chorro de agua a presión',
  'limpieza a alta presión', 'limpieza con chorro', 'servicio de hidrojet',
]

const ALL_TRIGGERS = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
const ALL_OFFERS = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase()
  return phrases.some((p) => lower.includes(p))
}

export class HydroJettingRule implements ScoringRule {
  dimension = 'hydro_jetting' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    if (ctx.jobType === 'plumbing') return null

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, ALL_TRIGGERS)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      if (!offered && matchesAny(text, ALL_OFFERS)) {
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
      ...(clipStartSec !== undefined && { clipStartSec }),
      ...(clipEndSec !== undefined && { clipEndSec }),
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 128 tests PASS (118 + 10)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/hydro-jetting.ts worker/src/__tests__/rules/hydro-jetting.test.ts
git commit -m "feat: HydroJettingRule — hydro-jetting upsell detection with 10 test scenarios"
```

---

## Task 3: GreaseTrapRule

**Files:**
- Create: `worker/src/__tests__/rules/grease-trap.test.ts`
- Create: `worker/src/lib/rules/grease-trap.ts`

This rule fires when a commercial/restaurant context or grease-in-drain signal is detected and the tech should offer grease trap service ($350–550).

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/grease-trap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { GreaseTrapRule } from '../../lib/rules/grease-trap.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new GreaseTrapRule()

describe('GreaseTrapRule', () => {
  it('1. EN: restaurant trigger + grease trap offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is a restaurant kitchen and we have grease coming out everywhere'),
      seg('speaker_0', 'You need a grease trap installed on that line'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: commercial kitchen trigger + interceptor offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We are a commercial kitchen and always have fats and oils in the drain'),
      seg('speaker_0', 'I recommend a grease interceptor for your facility'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is a food service establishment with kitchen grease problems'),
      seg('speaker_0', 'I can clear the line out today'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Have you considered a grease trap cleaning service?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Just a slow drain in the bathroom'),
      seg('speaker_0', 'I will snake that out'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: restaurant trigger + grease trap offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Tenemos un restaurante y hay grasa en el drenaje todo el tiempo', 0, 5),
      seg('speaker_0', 'Necesitan una trampa de grasa en esa línea', 6, 10),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: commercial kitchen trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Esto es una cocina comercial con mucha grasa en el desagüe'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=plumbing → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Restaurant grease buildup'),
      seg('speaker_0', 'Grease trap service'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This cafeteria has cooking grease issues'),
      seg('speaker_0', 'A FOG service and grease trap will solve this'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec is set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is a food establishment with grease in the drain', 10, 15),
      seg('speaker_0', 'You need a grease trap cleaning service', 16, 20),
    ]))
    expect(result?.clipStartSec).toBe(10)
    expect(result?.clipEndSec).toBe(20)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/grease-trap.js'"

- [ ] **Step 3: Create worker/src/lib/rules/grease-trap.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'restaurant', 'commercial kitchen', 'cafeteria', 'food service',
  'grease in the drain', 'kitchen grease', 'fats and oils',
  'cooking grease', 'greasy water', 'food establishment', 'food facility',
]

const TRIGGER_PHRASES_ES = [
  'restaurante', 'cocina comercial', 'cafetería', 'servicio de comida',
  'grasa en el drenaje', 'grasa en el desagüe', 'establecimiento de comida',
  'instalación de alimentos',
]

const OFFER_PHRASES_EN = [
  'grease trap', 'grease interceptor', 'fog service', 'grease trap cleaning',
  'interceptor service', 'grease removal service',
]

const OFFER_PHRASES_ES = [
  'trampa de grasa', 'interceptor de grasa', 'servicio de trampa de grasa',
  'limpieza de trampa', 'servicio de grasa', 'servicio fog',
]

const ALL_TRIGGERS = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
const ALL_OFFERS = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase()
  return phrases.some((p) => lower.includes(p))
}

export class GreaseTrapRule implements ScoringRule {
  dimension = 'grease_trap' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    if (ctx.jobType === 'plumbing') return null

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, ALL_TRIGGERS)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      if (!offered && matchesAny(text, ALL_OFFERS)) {
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
      ...(clipStartSec !== undefined && { clipStartSec }),
      ...(clipEndSec !== undefined && { clipEndSec }),
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 138 tests PASS (128 + 10)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/grease-trap.ts worker/src/__tests__/rules/grease-trap.test.ts
git commit -m "feat: GreaseTrapRule — grease trap upsell detection for commercial contexts with 10 test scenarios"
```

---

## Task 4: PipeRepairRule

**Files:**
- Create: `worker/src/__tests__/rules/pipe-repair.test.ts`
- Create: `worker/src/lib/rules/pipe-repair.ts`

This rule fires when pipe damage, cracks, root intrusion, or collapse is detected and the tech should offer pipe repair/lining ($850–1500).

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/pipe-repair.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { PipeRepairRule } from '../../lib/rules/pipe-repair.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new PipeRepairRule()

describe('PipeRepairRule', () => {
  it('1. EN: broken pipe trigger + pipe repair offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The camera showed a broken pipe under the foundation'),
      seg('speaker_0', 'We can do a pipe repair using trenchless methods'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: bellied pipe trigger + pipe lining offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We have a bellied pipe section that is holding water'),
      seg('speaker_0', 'Pipe lining is the best solution to fix that belly'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The camera showed a cracked pipe in the main line'),
      seg('speaker_0', 'I will write up the report and we can go from there'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'We could do a spot repair on any damaged section we find'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The drain is a little slow'),
      seg('speaker_0', 'Nothing unusual in the camera'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: pipe damage trigger + repair offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'La cámara mostró que la tubería está agrietada', 0, 4),
      seg('speaker_0', 'Podemos hacer una reparación sin zanja para arreglarla', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: collapsed pipe trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'La tubería colapsada no deja pasar nada'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=plumbing → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Broken pipe under the house'),
      seg('speaker_0', 'We can do pipe repair'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Root intrusion cracked the main pipe'),
      seg('speaker_0', 'CIPP lining will seal that pipe without digging'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec is set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The pipe is deteriorating and has corrosion all through it', 60, 65),
      seg('speaker_0', 'We should reline the pipe to seal everything', 66, 70),
    ]))
    expect(result?.clipStartSec).toBe(60)
    expect(result?.clipEndSec).toBe(70)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/pipe-repair.js'"

- [ ] **Step 3: Create worker/src/lib/rules/pipe-repair.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'broken pipe', 'cracked pipe', 'bellied pipe', 'pipe crack',
  'pipe damage', 'root intrusion', 'collapsed pipe', 'pipe collapse',
  'pipe corrosion', 'corroded pipe', 'hole in the pipe',
  'pipe is deteriorating', 'pipe failing',
]

const TRIGGER_PHRASES_ES = [
  'tubería rota', 'tubería agrietada', 'tubería dañada',
  'raíces en la tubería', 'tubería colapsada', 'corrosión en la tubería',
  'tubería deteriorada', 'tubería con fuga', 'tubería con grieta',
]

const OFFER_PHRASES_EN = [
  'pipe repair', 'pipe liner', 'pipe lining', 'trenchless repair',
  'cipp', 'spot repair', 'pipe replacement', 'reline the pipe',
  'pipe rehabilitation', 'repair the pipe', 'fix the pipe', 'sleeve the pipe',
]

const OFFER_PHRASES_ES = [
  'reparación de tubería', 'revestimiento de tubería',
  'reparación sin zanja', 'reemplazar la tubería', 'reparar la tubería',
  'rehabilitación de tubería',
]

const ALL_TRIGGERS = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
const ALL_OFFERS = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase()
  return phrases.some((p) => lower.includes(p))
}

export class PipeRepairRule implements ScoringRule {
  dimension = 'pipe_repair' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    if (ctx.jobType === 'plumbing') return null

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, ALL_TRIGGERS)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      if (!offered && matchesAny(text, ALL_OFFERS)) {
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
      ...(clipStartSec !== undefined && { clipStartSec }),
      ...(clipEndSec !== undefined && { clipEndSec }),
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 148 tests PASS (138 + 10)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/pipe-repair.ts worker/src/__tests__/rules/pipe-repair.test.ts
git commit -m "feat: PipeRepairRule — pipe repair/lining upsell detection with 10 test scenarios"
```

---

## Task 5: WaterHeaterRule

**Files:**
- Create: `worker/src/__tests__/rules/water-heater.test.ts`
- Create: `worker/src/lib/rules/water-heater.ts`

This rule fires when hot water complaints or aging water heater signals appear and the tech should offer replacement. **Note: default `jobType` in `ctx` is `'plumbing'` for this rule.**

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/water-heater.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { WaterHeaterRule } from '../../lib/rules/water-heater.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

// NOTE: default jobType is 'plumbing' for plumbing rules
function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'plumbing', durationSec: 600, language: 'en', ...overrides }
}

const rule = new WaterHeaterRule()

describe('WaterHeaterRule', () => {
  it('1. EN: no hot water trigger + replacement offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We have no hot water and the heater is making a loud noise'),
      seg('speaker_0', 'This unit is too old — I recommend a water heater replacement'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: old water heater trigger + tankless offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The old water heater has been leaking for a few days'),
      seg('speaker_0', 'A tankless water heater would be perfect for this home'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We are not getting enough hot water anymore, it runs out fast'),
      seg('speaker_0', 'I will take a look at the unit and let you know what I find'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Would you be interested in a water heater upgrade while we are here?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The kitchen faucet has low flow'),
      seg('speaker_0', 'I can clean the aerator on that'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: no hot water trigger + replacement offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'No hay agua caliente y el calentador está haciendo ruido', 0, 5),
      seg('speaker_0', 'Recomiendo el reemplazo del calentador, ya es muy viejo', 6, 10),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: rusty water trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Sale agua oxidada del calentador cuando abrimos el agua caliente'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=drain → returns null (plumbing rule, not applicable)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'No hot water at all'),
      seg('speaker_0', 'New water heater needed'),
    ], { jobType: 'drain' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water heater is leaking and we get lukewarm water'),
      seg('speaker_0', 'We should replace the water heater with a new tankless unit'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec is set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The heater is leaking and water is not hot', 30, 35),
      seg('speaker_0', 'I recommend a water heater installation here', 36, 41),
    ]))
    expect(result?.clipStartSec).toBe(30)
    expect(result?.clipEndSec).toBe(41)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/water-heater.js'"

- [ ] **Step 3: Create worker/src/lib/rules/water-heater.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'no hot water', 'not getting hot water', 'water not hot', 'lukewarm',
  'cold water from hot', 'water heater is old', 'water heater leaking',
  'rusty water', 'water heater making noise', 'old water heater',
  'hot water runs out', 'not enough hot water', 'heater is leaking',
]

const TRIGGER_PHRASES_ES = [
  'no hay agua caliente', 'agua fría del calentador', 'calentador viejo',
  'calentador con fuga', 'agua oxidada', 'calentador haciendo ruido',
  'poca agua caliente', 'calentador antiguo', 'calentador se está cayendo',
]

const OFFER_PHRASES_EN = [
  'water heater replacement', 'new water heater', 'replace the water heater',
  'tankless water heater', 'water heater upgrade', 'install a new heater',
  'water heater installation',
]

const OFFER_PHRASES_ES = [
  'reemplazo del calentador', 'nuevo calentador', 'calentador sin tanque',
  'instalación de calentador', 'reemplazar el calentador',
  'actualización del calentador',
]

const ALL_TRIGGERS = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
const ALL_OFFERS = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase()
  return phrases.some((p) => lower.includes(p))
}

export class WaterHeaterRule implements ScoringRule {
  dimension = 'water_heater' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    if (ctx.jobType === 'drain') return null

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, ALL_TRIGGERS)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      if (!offered && matchesAny(text, ALL_OFFERS)) {
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
      ...(clipStartSec !== undefined && { clipStartSec }),
      ...(clipEndSec !== undefined && { clipEndSec }),
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 158 tests PASS (148 + 10)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/water-heater.ts worker/src/__tests__/rules/water-heater.test.ts
git commit -m "feat: WaterHeaterRule — water heater replacement upsell detection with 10 test scenarios"
```

---

## Task 6: FixtureUpgradeRule

**Files:**
- Create: `worker/src/__tests__/rules/fixture-upgrade.test.ts`
- Create: `worker/src/lib/rules/fixture-upgrade.ts`

This rule fires when dripping faucets, running toilets, or worn fixtures are mentioned and the tech should offer fixture upgrades. Default `ctx` jobType: `'plumbing'`.

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/fixture-upgrade.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { FixtureUpgradeRule } from '../../lib/rules/fixture-upgrade.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'plumbing', durationSec: 600, language: 'en', ...overrides }
}

const rule = new FixtureUpgradeRule()

describe('FixtureUpgradeRule', () => {
  it('1. EN: dripping faucet trigger + new faucet offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The kitchen faucet has been dripping for weeks and it drives me crazy'),
      seg('speaker_0', 'We can replace that with a new faucet today, much better flow'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: running toilet trigger + toilet upgrade offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The toilet keeps running after you flush, it never fully stops'),
      seg('speaker_0', 'I recommend a toilet upgrade — newer models use much less water'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This old faucet has been leaking tap water all day'),
      seg('speaker_0', 'Let me check the washers and see if I can fix the seal'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'While I am here, would you like a fixture upgrade on that bathroom?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Water pressure is a little low today'),
      seg('speaker_0', 'I will check the main shutoff'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: dripping faucet trigger + new faucet offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El grifo que gotea en la cocina desperdicia mucha agua', 0, 5),
      seg('speaker_0', 'Le podemos poner un grifo nuevo con mejor tecnología', 6, 10),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: running toilet trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El inodoro corriendo toda la noche y consume mucha agua'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=drain → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Dripping faucet problem'),
      seg('speaker_0', 'New fixture for you'),
    ], { jobType: 'drain' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The showerhead is dripping and the toilet leak is ongoing'),
      seg('speaker_0', 'Let me install a new showerhead and replace the toilet internals'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The bathroom faucet is dripping tap all day and night', 12, 17),
      seg('speaker_0', 'Let us upgrade the fixture to stop the waste', 18, 22),
    ]))
    expect(result?.clipStartSec).toBe(12)
    expect(result?.clipEndSec).toBe(22)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/fixture-upgrade.js'"

- [ ] **Step 3: Create worker/src/lib/rules/fixture-upgrade.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'dripping faucet', 'dripping tap', 'leaking faucet', 'leaking tap',
  'faucet drip', 'running toilet', 'toilet keeps running', 'old faucet',
  'worn faucet', 'dripping shower', 'showerhead dripping', 'leaking toilet',
  'toilet leak', 'faucet is old',
]

const TRIGGER_PHRASES_ES = [
  'grifo que gotea', 'grifo con fuga', 'grifería vieja',
  'inodoro corriendo', 'inodoro con fuga', 'ducha goteando',
  'accesorio viejo', 'instalación vieja', 'grifo viejo',
]

const OFFER_PHRASES_EN = [
  'new faucet', 'fixture upgrade', 'replace the faucet', 'upgrade the faucet',
  'new fixture', 'new showerhead', 'replace the showerhead', 'new toilet',
  'replace the toilet', 'toilet upgrade', 'upgrade the fixture',
]

const OFFER_PHRASES_ES = [
  'nuevo grifo', 'grifería nueva', 'reemplazar el grifo',
  'actualizar el grifo', 'nuevo inodoro', 'nueva ducha',
  'nueva accesorio', 'nueva instalación',
]

const ALL_TRIGGERS = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
const ALL_OFFERS = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase()
  return phrases.some((p) => lower.includes(p))
}

export class FixtureUpgradeRule implements ScoringRule {
  dimension = 'fixture_upgrade' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    if (ctx.jobType === 'drain') return null

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, ALL_TRIGGERS)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      if (!offered && matchesAny(text, ALL_OFFERS)) {
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
      ...(clipStartSec !== undefined && { clipStartSec }),
      ...(clipEndSec !== undefined && { clipEndSec }),
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 168 tests PASS (158 + 10)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/fixture-upgrade.ts worker/src/__tests__/rules/fixture-upgrade.test.ts
git commit -m "feat: FixtureUpgradeRule — fixture upgrade upsell detection with 10 test scenarios"
```

---

## Task 7: WaterFiltrationRule

**Files:**
- Create: `worker/src/__tests__/rules/water-filtration.test.ts`
- Create: `worker/src/lib/rules/water-filtration.ts`

This rule fires when water quality complaints appear and the tech should offer filtration/softener. Default `ctx` jobType: `'plumbing'`.

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/water-filtration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { WaterFiltrationRule } from '../../lib/rules/water-filtration.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'plumbing', durationSec: 600, language: 'en', ...overrides }
}

const rule = new WaterFiltrationRule()

describe('WaterFiltrationRule', () => {
  it('1. EN: bad taste trigger + water filter offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water has a bad taste and smells like chlorine'),
      seg('speaker_0', 'A water filtration system would completely eliminate that'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: hard water trigger + water softener offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We have serious hard water and scale buildup on all our fixtures'),
      seg('speaker_0', 'I recommend a whole-home filter and water softener combo'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water quality has been poor, it looks cloudy and smells off'),
      seg('speaker_0', 'I will note that in the report for you'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'We also offer a reverse osmosis system if you are interested'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The hot water pressure is low'),
      seg('speaker_0', 'That might be the PRV, I will check it'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: water quality trigger + filtration offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El agua tiene mal sabor y huele a cloro', 0, 4),
      seg('speaker_0', 'Un sistema de filtración de agua resolverá ese problema', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: hard water trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El agua dura está dejando muchas manchas de agua en todo'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=drain → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Bad taste in the water'),
      seg('speaker_0', 'Water filtration system'),
    ], { jobType: 'drain' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water quality is terrible, yellow water from the tap'),
      seg('speaker_0', 'A whole home filter with RO system would fix that'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water has mineral buildup and spots everywhere', 25, 30),
      seg('speaker_0', 'Let me show you our water softener and filtration system options', 31, 36),
    ]))
    expect(result?.clipStartSec).toBe(25)
    expect(result?.clipEndSec).toBe(36)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/water-filtration.js'"

- [ ] **Step 3: Create worker/src/lib/rules/water-filtration.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'bad taste', 'water tastes', 'water smells', 'chlorine', 'hard water',
  'water spots', 'scale buildup', 'cloudy water', 'water discoloration',
  'water quality', 'yellow water', 'brown water', 'mineral buildup',
]

const TRIGGER_PHRASES_ES = [
  'mal sabor', 'agua sabe', 'agua huele', 'cloro', 'agua dura',
  'manchas de agua', 'acumulación de sarro', 'agua turbia',
  'calidad del agua', 'agua amarilla', 'agua café',
]

const OFFER_PHRASES_EN = [
  'water filtration', 'water filter', 'whole-home filter', 'whole home filter',
  'reverse osmosis', 'water softener', 'filtration system', 'water purification',
  'purification system', 'ro system',
]

const OFFER_PHRASES_ES = [
  'filtración de agua', 'filtro de agua', 'filtro para el hogar',
  'ósmosis inversa', 'suavizador de agua', 'sistema de filtración',
  'purificación de agua',
]

const ALL_TRIGGERS = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
const ALL_OFFERS = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase()
  return phrases.some((p) => lower.includes(p))
}

export class WaterFiltrationRule implements ScoringRule {
  dimension = 'water_filtration' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    if (ctx.jobType === 'drain') return null

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, ALL_TRIGGERS)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      if (!offered && matchesAny(text, ALL_OFFERS)) {
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
      ...(clipStartSec !== undefined && { clipStartSec }),
      ...(clipEndSec !== undefined && { clipEndSec }),
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 178 tests PASS (168 + 10)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/water-filtration.ts worker/src/__tests__/rules/water-filtration.test.ts
git commit -m "feat: WaterFiltrationRule — water filtration/softener upsell detection with 10 test scenarios"
```

---

## Task 8: PressureRegulatorRule

**Files:**
- Create: `worker/src/__tests__/rules/pressure-regulator.test.ts`
- Create: `worker/src/lib/rules/pressure-regulator.ts`

This rule fires on water pressure complaints (high or low) and the tech should offer a PRV/regulator install. Default `ctx` jobType: `'plumbing'`.

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/pressure-regulator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { PressureRegulatorRule } from '../../lib/rules/pressure-regulator.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'plumbing', durationSec: 600, language: 'en', ...overrides }
}

const rule = new PressureRegulatorRule()

describe('PressureRegulatorRule', () => {
  it('1. EN: high water pressure trigger + PRV offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The high water pressure is causing pipes to bang all night'),
      seg('speaker_0', 'A pressure reducing valve will fix that and protect your plumbing'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: water hammer trigger + regulator offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We hear a loud water hammer noise whenever we turn off the tap'),
      seg('speaker_0', 'I recommend installing a pressure regulator valve to stop that'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The pressure is too high in this building, everything is banging'),
      seg('speaker_0', 'I will measure the pressure and let you know what I find'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'We could install a PRV on the main line while we are here'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The shower takes a while to get warm'),
      seg('speaker_0', 'That is just the distance from the water heater'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: high pressure trigger + regulator offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'La presión de agua alta está dañando las tuberías', 0, 4),
      seg('speaker_0', 'Un regulador de presión solucionará ese problema', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: banging pipes trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Las tuberías golpeando hacen mucho ruido de noche'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=drain → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'High water pressure problem'),
      seg('speaker_0', 'Pressure regulator recommended'),
    ], { jobType: 'drain' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The pressure is inconsistent throughout the whole building'),
      seg('speaker_0', 'Installing a pressure regulator on the main would help a lot'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water pressure is way too high and keeps fluctuating', 40, 46),
      seg('speaker_0', 'We need to regulate the pressure — I will install a PRV', 47, 52),
    ]))
    expect(result?.clipStartSec).toBe(40)
    expect(result?.clipEndSec).toBe(52)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/pressure-regulator.js'"

- [ ] **Step 3: Create worker/src/lib/rules/pressure-regulator.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'high water pressure', 'pressure is too high', 'water pressure too high',
  'low water pressure', 'pressure is low', 'banging pipes', 'water hammer',
  'pipes banging', 'pressure problem', 'pressure fluctuating', 'pressure inconsistent',
]

const TRIGGER_PHRASES_ES = [
  'presión de agua alta', 'presión muy alta', 'presión del agua baja',
  'presión baja', 'tuberías golpeando', 'golpe de ariete', 'problema de presión',
  'presión fluctuante',
]

const OFFER_PHRASES_EN = [
  'pressure regulator', 'pressure reducing valve', 'prv',
  'pressure regulator valve', 'regulate the pressure', 'install a regulator',
  'pressure relief valve',
]

const OFFER_PHRASES_ES = [
  'regulador de presión', 'válvula reguladora', 'regular la presión',
  'instalar un regulador', 'válvula de alivio de presión',
]

const ALL_TRIGGERS = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
const ALL_OFFERS = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase()
  return phrases.some((p) => lower.includes(p))
}

export class PressureRegulatorRule implements ScoringRule {
  dimension = 'pressure_regulator' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    if (ctx.jobType === 'drain') return null

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, ALL_TRIGGERS)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      if (!offered && matchesAny(text, ALL_OFFERS)) {
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
      ...(clipStartSec !== undefined && { clipStartSec }),
      ...(clipEndSec !== undefined && { clipEndSec }),
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 188 tests PASS (178 + 10)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/pressure-regulator.ts worker/src/__tests__/rules/pressure-regulator.test.ts
git commit -m "feat: PressureRegulatorRule — pressure regulator upsell detection with 10 test scenarios"
```

---

## Task 9: WholeHomeRepipingRule

**Files:**
- Create: `worker/src/__tests__/rules/whole-home-repiping.test.ts`
- Create: `worker/src/lib/rules/whole-home-repiping.ts`

This rule fires when galvanized/polybutylene/lead pipes or whole-house corrosion is mentioned and the tech should offer full repiping. Default `ctx` jobType: `'plumbing'`.

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/rules/whole-home-repiping.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { WholeHomeRepipingRule } from '../../lib/rules/whole-home-repiping.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'plumbing', durationSec: 600, language: 'en', ...overrides }
}

const rule = new WholeHomeRepipingRule()

describe('WholeHomeRepipingRule', () => {
  it('1. EN: galvanized pipes trigger + repipe offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The whole house has galvanized pipes and they are heavily corroded'),
      seg('speaker_0', 'I recommend a whole-home repipe with copper to fix this permanently'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: polybutylene trigger + PEX repiping offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We discovered the house still has polybutylene pipes throughout'),
      seg('speaker_0', 'PEX repiping would be the safest solution for your home'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'All the pipes are old and corroding, they are throughout the whole house'),
      seg('speaker_0', 'I will document everything and send you a full report'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'If you are interested, we do full repipe jobs with a warranty'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The shower valve is stiff and hard to turn'),
      seg('speaker_0', 'I can replace the cartridge in that valve'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: galvanized pipes trigger + repipe offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Toda la casa tiene tuberías galvanizadas y están muy corrompidas', 0, 5),
      seg('speaker_0', 'Un repipeo completo con cobre sería la mejor solución', 6, 10),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: lead pipes trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Encontramos tubería de plomo en toda la casa, es un problema serio'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=drain → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Galvanized pipes everywhere'),
      seg('speaker_0', 'Full repipe recommended'),
    ], { jobType: 'drain' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The pipes are corroding and we have lead pipes throughout the building'),
      seg('speaker_0', 'A whole home repipe would eliminate all of these issues at once'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'These galvanized pipes are failing throughout the entire house', 50, 56),
      seg('speaker_0', 'Copper repiping of the whole house is the best long-term fix', 57, 62),
    ]))
    expect(result?.clipStartSec).toBe(50)
    expect(result?.clipEndSec).toBe(62)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -10
```

Expected: FAIL with "Cannot find module '../../lib/rules/whole-home-repiping.js'"

- [ ] **Step 3: Create worker/src/lib/rules/whole-home-repiping.ts**

```typescript
import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'galvanized pipes', 'galvanized pipe', 'polybutylene', 'poly-b',
  'lead pipes', 'lead pipe', 'all pipes are old', 'pipes throughout',
  'whole house pipes', 'pipes are corroding', 'pipes deteriorating',
  'all the pipes need',
]

const TRIGGER_PHRASES_ES = [
  'tuberías galvanizadas', 'tubería de plomo', 'tuberías por toda la casa',
  'tuberías viejas en toda', 'tuberías se están corroyendo',
  'toda la tubería', 'tubería galvanizada',
]

const OFFER_PHRASES_EN = [
  'repipe', 'repiping', 'whole-home repipe', 'whole home repipe',
  'replace all pipes', 'copper repiping', 'pex repiping', 'full repipe',
]

const OFFER_PHRASES_ES = [
  'reemplazo de tuberías', 'reemplazar todas las tuberías',
  'repipeo completo', 'repipeo de toda', 'repiping',
]

const ALL_TRIGGERS = [...TRIGGER_PHRASES_EN, ...TRIGGER_PHRASES_ES]
const ALL_OFFERS = [...OFFER_PHRASES_EN, ...OFFER_PHRASES_ES]

function matchesAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase()
  return phrases.some((p) => lower.includes(p))
}

export class WholeHomeRepipingRule implements ScoringRule {
  dimension = 'whole_home_repiping' as const

  evaluate(ctx: RuleContext): RuleResult | null {
    if (ctx.jobType === 'drain') return null

    let triggered = false
    let offered = false
    let clipStartSec: number | undefined
    let clipEndSec: number | undefined

    for (const seg of ctx.segments) {
      const text = seg.text

      if (!triggered && matchesAny(text, ALL_TRIGGERS)) {
        triggered = true
        clipStartSec = seg.startSec
      }

      if (!offered && matchesAny(text, ALL_OFFERS)) {
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
      ...(clipStartSec !== undefined && { clipStartSec }),
      ...(clipEndSec !== undefined && { clipEndSec }),
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -15
```

Expected: 198 tests PASS (188 + 10)

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/rules/whole-home-repiping.ts worker/src/__tests__/rules/whole-home-repiping.test.ts
git commit -m "feat: WholeHomeRepipingRule — whole-home repiping upsell detection with 10 test scenarios"
```

---

## Task 10: Wire All 9 Rules into index.ts

**Files:**
- Modify: `worker/src/lib/rules/index.ts`

Add the 9 new imports and push all into the `RULES` array. No new tests — existing `runRules()` tests will exercise the expanded rule set.

- [ ] **Step 1: Replace worker/src/lib/rules/index.ts entirely**

```typescript
import type { RuleResult } from '@kova/shared'
import type { RuleContext, ScoringRule } from './types.js'
import { CameraInspectionRule } from './camera-inspection.js'
import { MaintenancePlanRule } from './maintenance-plan.js'
import { DrainCleaningUpsellRule } from './drain-cleaning-upsell.js'
import { HydroJettingRule } from './hydro-jetting.js'
import { GreaseTrapRule } from './grease-trap.js'
import { PipeRepairRule } from './pipe-repair.js'
import { WaterHeaterRule } from './water-heater.js'
import { FixtureUpgradeRule } from './fixture-upgrade.js'
import { WaterFiltrationRule } from './water-filtration.js'
import { PressureRegulatorRule } from './pressure-regulator.js'
import { WholeHomeRepipingRule } from './whole-home-repiping.js'

// ---------------------------------------------------------------------------
// Rule registry — order does not affect scoring (each rule is independent)
// ---------------------------------------------------------------------------

const RULES: ScoringRule[] = [
  // Drain rules
  new CameraInspectionRule(),
  new MaintenancePlanRule(),
  new DrainCleaningUpsellRule(),
  new HydroJettingRule(),
  new GreaseTrapRule(),
  new PipeRepairRule(),
  // Plumbing rules
  new WaterHeaterRule(),
  new FixtureUpgradeRule(),
  new WaterFiltrationRule(),
  new PressureRegulatorRule(),
  new WholeHomeRepipingRule(),
]

// ---------------------------------------------------------------------------
// Suppression signals
// ---------------------------------------------------------------------------

const EMERGENCY_PHRASES = [
  'emergency', 'urgent', 'flooding', 'burst', 'sewage backup',
  'emergencia', 'urgente', 'inundación', 'tubería rota',
]

// NOTE: Substring matching is intentional for simplicity (Phase 1).
// Known limitations: 'burst' matches 'outburst', speaker-agnostic.
// TODO: Add word-boundary matching and speaker filtering in a future iteration.
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
        confidence: 0.95, // deterministic convention: all rule results are 0.95
        suppressedReason,
      }]
    }

    return [result]
  })
}
```

- [ ] **Step 2: Run all tests to verify nothing broke**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @kova/worker test 2>&1 | tail -20
```

Expected: 198 tests PASS. The existing `runRules()` tests in `__tests__/rules/index.test.ts` will still pass — new rules simply extend the registry without changing existing behavior.

- [ ] **Step 3: Commit**

```bash
git add worker/src/lib/rules/index.ts
git commit -m "feat: register all 9 new rules in runRules() — DrainCleaningUpsell, HydroJetting, GreaseTrap, PipeRepair, WaterHeater, FixtureUpgrade, WaterFiltration, PressureRegulator, WholeHomeRepiping"
```

---

## Task 11: Full CI Simulation

- [ ] **Step 1: Run full test suite**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm test 2>&1 | tail -30
```

Expected: mobile (17) + web (6) + worker (175) = **198 tests** all PASS.

Worker breakdown should be: 5 scoring + 7 index + 20 camera + 20 maintenance + 11 deepgram + 3 s3 + 6 llm + 5 pricebook + 8 score-assembly + 10×9 new rules = 175.

- [ ] **Step 2: Typecheck all packages**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm typecheck 2>&1 | tail -10
```

Expected: `Tasks: 5 successful, 5 total`

Common typecheck issues:
- Missing `.js` extension on an import → add it
- `dimension = 'xyz' as const` not matching `ScoringDimension` → verify the literal exactly matches the union in `packages/shared/src/types.ts`

- [ ] **Step 3: Lint**

```bash
source ~/.nvm/nvm.sh && nvm use 22 && pnpm lint 2>&1 | tail -10
```

Expected: `Tasks: 5 successful, 5 total` (warnings OK, zero errors)

If lint errors appear:
- Unused variable: remove it
- `@typescript-eslint/consistent-type-imports`: use `import type` for type-only imports

- [ ] **Step 4: Final commit if CI adjustments needed**

```bash
git add -A
git commit -m "fix: CI lint/typecheck cleanup for week 7a rules"
```

---

## Self-Review

Spec coverage:
- ✅ `drain_cleaning_upsell` — DrainCleaningUpsellRule (Task 1)
- ✅ `hydro_jetting` — HydroJettingRule (Task 2)
- ✅ `grease_trap` — GreaseTrapRule (Task 3)
- ✅ `pipe_repair` — PipeRepairRule (Task 4)
- ✅ `water_heater` — WaterHeaterRule (Task 5)
- ✅ `fixture_upgrade` — FixtureUpgradeRule (Task 6)
- ✅ `water_filtration` — WaterFiltrationRule (Task 7)
- ✅ `pressure_regulator` — PressureRegulatorRule (Task 8)
- ✅ `whole_home_repiping` — WholeHomeRepipingRule (Task 9)
- ✅ All 9 registered in `runRules()` (Task 10)
- ✅ CI green (Task 11)

Type consistency:
- All `dimension` literals match `ScoringDimension` from `packages/shared/src/types.ts` exactly.
- All plumbing rules gate on `ctx.jobType === 'drain'`; all drain rules gate on `ctx.jobType === 'plumbing'`.
- `confidence: 0.95` is set in all rule returns (deterministic convention).
