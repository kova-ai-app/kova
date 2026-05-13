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

  it('11. Multiple EN triggers strengthen evidence', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'There is no hot water and the water heater is old'),
      seg('speaker_1', 'Plus the hot water runs out really fast'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. Partial word does not false-positive: "waterfall" ≠ water heater trigger', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'They have a decorative waterfall feature here'),
      seg('speaker_1', 'Looks nice'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(false)
  })

  it('13. Mixed bilingual: EN trigger in mostly-ES call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Todo se ve bien por aquí', 0, 20),
      seg('speaker_0', 'But there is no hot water coming out of this tap', 20, 45),
      seg('speaker_1', 'Ah sí, lo veo', 45, 55),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
  })

  it('14. Alternate EN offer: "tankless water heater" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water heater is old and rusty water is coming out'),
      seg('speaker_0', 'A tankless water heater would solve this permanently'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. Alternate EN offer: "water heater installation" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'There is not enough hot water in this house'),
      seg('speaker_0', 'I can quote you a water heater installation today'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('16. ES offer: "calentador sin tanque" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'No hay agua caliente y el calentador es muy viejo'),
      seg('speaker_0', 'Un calentador sin tanque sería la solución perfecta'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('17. jobType=null — water-heater rule still evaluates', () => {
    const result = rule.evaluate(ctx(
      [seg('speaker_1', 'There is no hot water and the water heater is leaking')],
      { jobType: null as any }
    ))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  it('18. Clip timestamp at startSec=0', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'No hot water at all, the water heater is old', 0, 12),
      seg('speaker_0', 'Let me take a look', 12, 25),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(0)
  })

  it('19. Clip timestamp late in call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'The plumbing looks okay overall', 0, 380),
      seg('speaker_1', 'Actually the water heater is leaking at the bottom', 510, 550),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(510)
  })

  it('20. ES trigger only — Spanish missed opportunity', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'No hay agua caliente y hay poca agua caliente disponible', 0, 25),
      seg('speaker_0', 'Lo reviso', 25, 40),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })
})
