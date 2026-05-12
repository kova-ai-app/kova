import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

const TRIGGER_PHRASES_EN = [
  'dripping faucet', 'dripping tap', 'leaking faucet', 'leaking tap',
  'faucet drip', 'running toilet', 'toilet keeps running', 'old faucet',
  'worn faucet', 'dripping shower', 'showerhead dripping', 'leaking toilet',
  'toilet leak', 'faucet is old', 'dripping',
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
  'nuevo grifo', 'grifo nuevo', 'grifería nueva', 'reemplazar el grifo',
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
