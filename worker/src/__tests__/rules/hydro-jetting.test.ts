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
})
