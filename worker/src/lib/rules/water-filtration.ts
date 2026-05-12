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
