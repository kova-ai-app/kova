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
