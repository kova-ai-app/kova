import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'no hot water', 'not getting hot water', 'water not hot', 'lukewarm',
  'cold water from hot', 'water heater is old', 'water heater leaking',
  'rusty water', 'water heater making noise', 'old water heater',
  'hot water runs out', 'not enough hot water', 'enough hot water', 'heater is leaking',
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
