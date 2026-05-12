import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'broken pipe', 'cracked pipe', 'bellied pipe', 'pipe crack',
  'pipe damage', 'root intrusion', 'collapsed pipe', 'pipe collapse',
  'pipe corrosion', 'corroded pipe', 'hole in the pipe',
  'pipe is deteriorating', 'pipe failing',
]

const TRIGGER_PHRASES_ES = [
  'tubería rota', 'tubería agrietada', 'tubería está agrietada', 'tubería dañada',
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
