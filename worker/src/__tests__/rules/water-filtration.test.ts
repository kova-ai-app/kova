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
})
