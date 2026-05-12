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
