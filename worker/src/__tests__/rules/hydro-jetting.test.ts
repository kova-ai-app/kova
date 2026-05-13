import { describe, it, expect } from 'vitest'
import { HydroJettingRule } from '../../lib/rules/hydro-jetting.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new HydroJettingRule()

describe('HydroJettingRule', () => {
  it('1. EN: grease buildup trigger + hydro jet offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'There is serious grease buildup throughout the main line'),
      seg('speaker_0', 'I recommend hydro jetting to fully clear that out'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: root intrusion trigger + jet the line offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We have serious root intrusion in the sewer line'),
      seg('speaker_0', 'We can jet the line to blast those roots out'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The mainline is completely blocked with scale buildup'),
      seg('speaker_0', 'I will snake it out for now'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Would you like me to do a hydro-jetting service while I am here?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The sink is a little slow today'),
      seg('speaker_0', 'I can clear this quickly'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: grease trigger + hydro offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Hay mucha acumulación de grasa en la línea principal', 0, 4),
      seg('speaker_0', 'Le recomiendo un servicio de hidrojet para limpiar eso', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: root intrusion trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Hay una intrusión de raíces en la línea principal'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=plumbing → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Grease buildup everywhere'),
      seg('speaker_0', 'Hydro jetting will fix it'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies and triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is a commercial restaurant with severe grease buildup'),
      seg('speaker_0', 'Hydro-jetting is the right solution here'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec is set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The main line has heavy buildup from roots', 45, 50),
      seg('speaker_0', 'We should do hydro-jetting on this', 51, 55),
    ]))
    expect(result?.clipStartSec).toBe(45)
    expect(result?.clipEndSec).toBe(55)
  })

  it('11. Multiple EN triggers strengthen evidence', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'There is grease buildup in the main line'),
      seg('speaker_1', 'Also a severe clog further down the sewer line'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. Partial word does not false-positive: "hydrating" ≠ hydro jet', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'I recommend hydrating the pipes from the outside'),
      seg('speaker_1', 'Okay'),
    ]))
    expect(result?.triggered).toBe(false)
  })

  it('13. Mixed bilingual: EN trigger in mostly-ES call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Todo se ve bien', 0, 20),
      seg('speaker_0', 'There is heavy grease buildup in the main line', 20, 50),
      seg('speaker_1', 'Entendido', 50, 60),
    ]))
    expect(result?.triggered).toBe(true)
  })

  it('14. Alternate EN offer: "water jet" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The sewer line has roots in the pipe'),
      seg('speaker_0', 'We can use a water jet to clear it out'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. Alternate EN offer: "jet cleaning" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'There is hard buildup causing the recurring blockage'),
      seg('speaker_0', 'Jet cleaning is the right solution here'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('16. ES offer: "limpieza a alta presión" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Hay acumulación de grasa en la línea principal'),
      seg('speaker_0', 'Le recomiendo una limpieza a alta presión'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('17. jobType=null — hydro-jetting rule still evaluates', () => {
    const result = rule.evaluate(ctx(
      [seg('speaker_1', 'The main line has severe grease buildup')],
      { jobType: null as any }
    ))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  it('18. Clip timestamp at startSec=0', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Grease buildup at the start of the call', 0, 10),
      seg('speaker_0', 'I see it', 10, 20),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(0)
  })

  it('19. Clip timestamp late in call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Everything else looks fine', 0, 400),
      seg('speaker_1', 'Wait, there are roots in the pipe near the end', 540, 580),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(540)
  })

  it('20. ES trigger only — Spanish missed opportunity', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Hay una obstrucción severa en la línea principal', 0, 25),
      seg('speaker_0', 'Okay lo reviso', 25, 40),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })
})
