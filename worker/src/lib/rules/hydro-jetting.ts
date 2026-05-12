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
