import { describe, it, expect } from 'vitest'
import { WholeHomeRepipingRule } from '../../lib/rules/whole-home-repiping.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'plumbing', durationSec: 600, language: 'en', ...overrides }
}

const rule = new WholeHomeRepipingRule()

describe('WholeHomeRepipingRule', () => {
  it('1. EN: galvanized pipes trigger + repipe offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The whole house has galvanized pipes and they are heavily corroded'),
      seg('speaker_0', 'I recommend a whole-home repipe with copper to fix this permanently'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: polybutylene trigger + PEX repiping offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We discovered the house still has polybutylene pipes throughout'),
      seg('speaker_0', 'PEX repiping would be the safest solution for your home'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'All the pipes are old and corroding, they are throughout the whole house'),
      seg('speaker_0', 'I will document everything and send you a full report'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'If you are interested, we do full repipe jobs with a warranty'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The shower valve is stiff and hard to turn'),
      seg('speaker_0', 'I can replace the cartridge in that valve'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: galvanized pipes trigger + repipe offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Toda la casa tiene tuberías galvanizadas y están muy corrompidas', 0, 5),
      seg('speaker_0', 'Un repipeo completo con cobre sería la mejor solución', 6, 10),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: lead pipes trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Encontramos tubería de plomo en toda la casa, es un problema serio'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=drain → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Galvanized pipes everywhere'),
      seg('speaker_0', 'Full repipe recommended'),
    ], { jobType: 'drain' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The pipes are corroding and we have lead pipes throughout the building'),
      seg('speaker_0', 'A whole home repipe would eliminate all of these issues at once'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'These galvanized pipes are failing throughout the entire house', 50, 56),
      seg('speaker_0', 'Copper repiping of the whole house is the best long-term fix', 57, 62),
    ]))
    expect(result?.clipStartSec).toBe(50)
    expect(result?.clipEndSec).toBe(62)
  })
})
