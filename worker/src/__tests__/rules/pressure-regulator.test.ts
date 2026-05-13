import { describe, it, expect } from 'vitest'
import { PressureRegulatorRule } from '../../lib/rules/pressure-regulator.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'plumbing', durationSec: 600, language: 'en', ...overrides }
}

const rule = new PressureRegulatorRule()

describe('PressureRegulatorRule', () => {
  it('1. EN: high water pressure trigger + PRV offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The high water pressure is causing pipes to bang all night'),
      seg('speaker_0', 'A pressure reducing valve will fix that and protect your plumbing'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: water hammer trigger + regulator offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We hear a loud water hammer noise whenever we turn off the tap'),
      seg('speaker_0', 'I recommend installing a pressure regulator valve to stop that'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The pressure is too high in this building, everything is banging'),
      seg('speaker_0', 'I will measure the pressure and let you know what I find'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'We could install a PRV on the main line while we are here'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The shower takes a while to get warm'),
      seg('speaker_0', 'That is just the distance from the water heater'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: high pressure trigger + regulator offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'La presión de agua alta está dañando las tuberías', 0, 4),
      seg('speaker_0', 'Un regulador de presión solucionará ese problema', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: banging pipes trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Las tuberías golpeando hacen mucho ruido de noche'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=drain → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'High water pressure problem'),
      seg('speaker_0', 'Pressure regulator recommended'),
    ], { jobType: 'drain' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The pressure is inconsistent throughout the whole building'),
      seg('speaker_0', 'Installing a pressure regulator on the main would help a lot'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water pressure is way too high and keeps fluctuating', 40, 46),
      seg('speaker_0', 'We need to regulate the pressure — I will install a PRV', 47, 52),
    ]))
    expect(result?.clipStartSec).toBe(40)
    expect(result?.clipEndSec).toBe(52)
  })

  it('11. Multiple EN triggers strengthen evidence', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The high water pressure is causing banging pipes'),
      seg('speaker_1', 'And the pressure is inconsistent throughout the house'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. Partial word does not false-positive: "pressure washing" context mismatch', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'We do pressure washing on the driveway'),
      seg('speaker_1', 'Looks great'),
    ], { jobType: 'plumbing' }))
    // "pressure washing" does not include "high water pressure" or similar pipe-pressure triggers
    expect(result?.triggered).toBe(false)
  })

  it('13. Mixed bilingual: EN trigger in mostly-ES call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El sistema de tuberías se ve bien', 0, 20),
      seg('speaker_0', 'But the water pressure is too high in this house', 20, 45),
      seg('speaker_1', 'Sí, la presión está muy alta', 45, 60),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
  })

  it('14. Alternate EN offer: "pressure reducing valve" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The high water pressure is causing damage'),
      seg('speaker_0', 'A pressure reducing valve will fix this right away'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. Alternate EN offer: "prv" abbreviation recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Water hammer is happening every time we open a faucet'),
      seg('speaker_0', 'Installing a PRV is the right fix for this situation'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('16. ES offer: "válvula reguladora" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'La presión de agua alta está afectando los electrodomésticos'),
      seg('speaker_0', 'Le recomiendo instalar una válvula reguladora de presión'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('17. jobType=null — pressure-regulator rule still evaluates', () => {
    const result = rule.evaluate(ctx(
      [seg('speaker_1', 'The water pressure is too high and pipes are banging')],
      { jobType: null as any }
    ))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  it('18. Clip timestamp at startSec=0', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'High water pressure issue noticed right at start', 0, 10),
      seg('speaker_0', 'Let me check', 10, 20),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(0)
  })

  it('19. Clip timestamp late in call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Plumbing looks normal', 0, 350),
      seg('speaker_1', 'Oh the water hammer just happened — those banging pipes are loud', 520, 560),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(520)
  })

  it('20. ES trigger only — Spanish missed opportunity', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'La presión de agua alta está muy alta y las tuberías golpeando', 0, 25),
      seg('speaker_0', 'Lo reviso', 25, 40),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })
})
