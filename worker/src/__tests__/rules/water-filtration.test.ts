import { describe, it, expect } from 'vitest'
import { WaterFiltrationRule } from '../../lib/rules/water-filtration.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'plumbing', durationSec: 600, language: 'en', ...overrides }
}

const rule = new WaterFiltrationRule()

describe('WaterFiltrationRule', () => {
  it('1. EN: bad taste trigger + water filter offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water has a bad taste and smells like chlorine'),
      seg('speaker_0', 'A water filtration system would completely eliminate that'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: hard water trigger + water softener offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We have serious hard water and scale buildup on all our fixtures'),
      seg('speaker_0', 'I recommend a whole-home filter and water softener combo'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water quality has been poor, it looks cloudy and smells off'),
      seg('speaker_0', 'I will note that in the report for you'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'We also offer a reverse osmosis system if you are interested'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The hot water pressure is low'),
      seg('speaker_0', 'That might be the PRV, I will check it'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: water quality trigger + filtration offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El agua tiene mal sabor y huele a cloro', 0, 4),
      seg('speaker_0', 'Un sistema de filtración de agua resolverá ese problema', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: hard water trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El agua dura está dejando muchas manchas de agua en todo'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=drain → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Bad taste in the water'),
      seg('speaker_0', 'Water filtration system'),
    ], { jobType: 'drain' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water quality is terrible, yellow water from the tap'),
      seg('speaker_0', 'A whole home filter with RO system would fix that'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water has mineral buildup and spots everywhere', 25, 30),
      seg('speaker_0', 'Let me show you our water softener and filtration system options', 31, 36),
    ]))
    expect(result?.clipStartSec).toBe(25)
    expect(result?.clipEndSec).toBe(36)
  })

  it('11. Multiple EN triggers strengthen evidence', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water has a bad taste and there are lots of water spots'),
      seg('speaker_1', 'Also the water quality here seems poor with mineral buildup'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. Partial word does not false-positive: "filtered" without trigger context', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'The contractor filtered through all the options'),
      seg('speaker_1', 'Makes sense'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(false)
  })

  it('13. Mixed bilingual: EN trigger in mostly-ES call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'La tubería principal se ve bien', 0, 20),
      seg('speaker_0', 'But the water tastes really off in this house', 20, 45),
      seg('speaker_1', 'Sí, el agua tiene mal sabor', 45, 60),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
  })

  it('14. Alternate EN offer: "reverse osmosis" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water has a bad taste and the water quality is poor'),
      seg('speaker_0', 'A reverse osmosis system would fix that for good'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. Alternate EN offer: "water softener" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We have really hard water and lots of scale buildup'),
      seg('speaker_0', 'A water softener is exactly what this house needs'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('16. ES offer: "ósmosis inversa" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El agua tiene mal sabor y hay manchas de agua por todos lados'),
      seg('speaker_0', 'Le recomiendo un sistema de ósmosis inversa'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('17. jobType=null — water-filtration rule still evaluates', () => {
    const result = rule.evaluate(ctx(
      [seg('speaker_1', 'The water tastes bad and there is hard water scaling')],
      { jobType: null as any }
    ))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  it('18. Clip timestamp at startSec=0', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The water has a bad taste right from the start', 0, 12),
      seg('speaker_0', 'I will test it', 12, 22),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(0)
  })

  it('19. Clip timestamp late in call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Plumbing looks fine overall', 0, 400),
      seg('speaker_1', 'Actually the water smells strange near the end here', 545, 580),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(545)
  })

  it('20. ES trigger only — Spanish missed opportunity', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El agua sabe muy raro y hay manchas de agua en todo', 0, 25),
      seg('speaker_0', 'Entendido, voy a revisar', 25, 40),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })
})
