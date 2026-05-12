import { describe, it, expect } from 'vitest'
import { WaterHeaterRule } from '../../lib/rules/water-heater.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

// NOTE: default jobType is 'plumbing' for plumbing rules
function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'plumbing', durationSec: 600, language: 'en', ...overrides }
}

const rule = new WaterHeaterRule()

describe('WaterHeaterRule', () => {
  it('1. EN: no hot water trigger + replacement offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We have no hot water and the heater is making a loud noise'),
      seg('speaker_0', 'This unit is too old — I recommend a water heater replacement'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: old water heater trigger + tankless offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The old water heater has been leaking for a few days'),
      seg('speaker_0', 'A tankless water heater would be perfect for this home'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We are not getting enough hot water anymore, it runs out fast'),
      seg('speaker_0', 'I will take a look at the unit and let you know what I find'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Would you be interested in a water heater upgrade while we are here?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The kitchen faucet has low flow'),
      seg('speaker_0', 'I can clean the aerator on that'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: no hot water trigger + replacement offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'No hay agua caliente y el calentador está haciendo ruido', 0, 5),
      seg('speaker_0', 'Recomiendo el reemplazo del calentador, ya es muy viejo', 6, 10),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: rusty water trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Sale agua oxidada del calentador cuando abrimos el agua caliente'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=drain → returns null (plumbing rule, not applicable)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'No hot water at all'),
      seg('speaker_0', 'New water heater needed'),
    ], { jobType: 'drain' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water heater is leaking and we get lukewarm water'),
      seg('speaker_0', 'We should replace the water heater with a new tankless unit'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec is set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The heater is leaking and water is not hot', 30, 35),
      seg('speaker_0', 'I recommend a water heater installation here', 36, 41),
    ]))
    expect(result?.clipStartSec).toBe(30)
    expect(result?.clipEndSec).toBe(41)
  })
})
