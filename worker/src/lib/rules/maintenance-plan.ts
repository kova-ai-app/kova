import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

// ---------------------------------------------------------------------------
// Trigger keywords (recurrence concern from customer)
// ---------------------------------------------------------------------------

const TRIGGER_PHRASES_EN = [
  'keeps happening', 'keeps coming back', 'keeps backing up', 'keeps clogging', 'recurring', 'same problem',
  'every year', 'every few months', 'twice a year', 'once a year',
  'third time', 'second time', 'all the time', 'same problem again',
  'backed up again', 'clogged again',
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
