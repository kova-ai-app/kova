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
})
