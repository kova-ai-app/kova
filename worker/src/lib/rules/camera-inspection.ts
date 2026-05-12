import type { RuleResult } from '@kova/shared'
import type { ScoringRule, RuleContext } from './types.js'

// ---------------------------------------------------------------------------
// Trigger keywords (case-insensitive)
// ---------------------------------------------------------------------------

const TRIGGER_PHRASES_EN = [
  'keeps happening', 'keeps coming back', 'again', 'recurring', 'recurrence',
  'third time', 'second time', 'every year', 'every few months', 'twice a year',
  'prior service', 'prior visit', 'had someone out', 'been out before',
  'before for this', 'already been here', 'house was built',
  'older home', 'old pipes', 'old house', 'built in 19',
]

const TRIGGER_PHRASES_ES = [
  'pasa cada', 'pasa repetidamente', 'sigue pasando', 'vuelve a pasar',
  'otra vez', 'de nuevo', 'ya vinieron', 'ya estuvieron', 'antes por esto',
  'servicio previo', 'visita previa', 'la casa tiene', 'tubería vieja',
  'casa antigua', 'construida en 19',
]

// ---------------------------------------------------------------------------
// Offer keywords (case-insensitive; match as whole words / substrings)
// ---------------------------------------------------------------------------

const OFFER_PHRASES_EN = [
  'camera inspection', 'camera scope', 'video inspection',
  'run a camera', 'run the camera', 'scope the line',
  'camera down', 'send a camera',
]

const OFFER_PHRASES_ES = [
  'inspección con cámara', 'inspección de cámara', 'cámara de video',
  'cámara en la tubería', 'hacer una cámara', 'pasar la cámara',
]

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

export class CameraInspectionRule implements ScoringRule {
  dimension = 'camera_inspection' as const

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

      if (!offered && matchesAny(text, allOffers)) {
        offered = true
        clipEndSec = seg.endSec
        if (clipStartSec === undefined) clipStartSec = seg.startSec
      }
    }

    // If only offer was found (no trigger), still record it
    if (!triggered && !offered) {
      return { dimension: this.dimension, triggered: false, offered: false, confidence: 0.95 }
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
