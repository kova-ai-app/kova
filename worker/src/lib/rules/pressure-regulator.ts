import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'high water pressure', 'pressure is too high', 'water pressure too high',
  'low water pressure', 'pressure is low', 'banging pipes', 'water hammer',
  'pipes banging', 'pressure problem', 'pressure fluctuating', 'pressure inconsistent',
  'pressure is inconsistent', 'way too high',
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
