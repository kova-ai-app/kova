import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'galvanized pipes', 'galvanized pipe', 'polybutylene', 'poly-b',
  'lead pipes', 'lead pipe', 'all pipes are old', 'pipes are old', 'pipes throughout',
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
