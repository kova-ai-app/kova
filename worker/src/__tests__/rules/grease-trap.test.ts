import { describe, it, expect } from 'vitest'
import { GreaseTrapRule } from '../../lib/rules/grease-trap.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new GreaseTrapRule()

describe('GreaseTrapRule', () => {
  it('1. EN: restaurant trigger + grease trap offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is a restaurant kitchen and we have grease coming out everywhere'),
      seg('speaker_0', 'You need a grease trap installed on that line'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: commercial kitchen trigger + interceptor offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We are a commercial kitchen and always have fats and oils in the drain'),
      seg('speaker_0', 'I recommend a grease interceptor for your facility'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is a food service establishment with kitchen grease problems'),
      seg('speaker_0', 'I can clear the line out today'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Have you considered a grease trap cleaning service?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Just a slow drain in the bathroom'),
      seg('speaker_0', 'I will snake that out'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: restaurant trigger + grease trap offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Tenemos un restaurante y hay grasa en el drenaje todo el tiempo', 0, 5),
      seg('speaker_0', 'Necesitan una trampa de grasa en esa línea', 6, 10),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: commercial kitchen trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Esto es una cocina comercial con mucha grasa en el desagüe'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=plumbing → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Restaurant grease buildup'),
      seg('speaker_0', 'Grease trap service'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This cafeteria has cooking grease issues'),
      seg('speaker_0', 'A FOG service and grease trap will solve this'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec is set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is a food establishment with grease in the drain', 10, 15),
      seg('speaker_0', 'You need a grease trap cleaning service', 16, 20),
    ]))
    expect(result?.clipStartSec).toBe(10)
    expect(result?.clipEndSec).toBe(20)
  })

  it('11. Multiple EN triggers strengthen evidence', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is a commercial kitchen in the restaurant'),
      seg('speaker_1', 'And there is cooking grease backing up everywhere'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. Partial word does not false-positive: "greasy" ≠ grease trigger context', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'The hands get greasy when working on older pipes'),
      seg('speaker_1', 'Yeah that happens'),
    ]))
    expect(result?.triggered).toBe(false)
  })

  it('13. Mixed bilingual: EN trigger in mostly-ES call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El lugar está limpio', 0, 20),
      seg('speaker_0', 'But this is a food establishment so there is grease in the drain', 20, 50),
      seg('speaker_1', 'Correcto', 50, 60),
    ]))
    expect(result?.triggered).toBe(true)
  })

  it('14. Alternate EN offer: "grease interceptor" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This commercial kitchen has lots of cooking grease'),
      seg('speaker_0', 'You need a grease interceptor installed here'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. Alternate EN offer: "fog service" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'There is grease in the drain from the cafeteria'),
      seg('speaker_0', 'We can set up a fog service to manage this'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('16. ES offer: "trampa de grasa" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Hay grasa en el drenaje del restaurante'),
      seg('speaker_0', 'Necesitan instalar una trampa de grasa'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('17. jobType=null — grease-trap rule still evaluates', () => {
    const result = rule.evaluate(ctx(
      [seg('speaker_1', 'This is a restaurant with grease in the drain')],
      { jobType: null as any }
    ))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  it('18. Clip timestamp at startSec=0', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is a commercial kitchen with cooking grease issues', 0, 12),
      seg('speaker_0', 'I see the problem', 12, 20),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(0)
  })

  it('19. Clip timestamp late in call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'The pipes look fine overall', 0, 350),
      seg('speaker_1', 'Oh wait this is a cafeteria, I see cooking grease buildup', 520, 560),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(520)
  })

  it('20. ES trigger only — Spanish missed opportunity', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Este es un establecimiento de comida con grasa en el desagüe', 0, 25),
      seg('speaker_0', 'Entendido, lo reviso', 25, 40),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })
})
