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

  it('11. Multiple EN triggers strengthen evidence', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The pipes are old throughout and galvanized pipes are corroding'),
      seg('speaker_1', 'The whole house pipes need to be evaluated'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. Partial word does not false-positive: "pipe wrench" ≠ repiping trigger', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'I used a pipe wrench to tighten the fitting'),
      seg('speaker_1', 'Good'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(false)
  })

  it('13. Mixed bilingual: EN trigger in mostly-ES call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'La instalación es bastante nueva en general', 0, 20),
      seg('speaker_0', 'But the galvanized pipes in the back are corroding badly', 20, 50),
      seg('speaker_1', 'Ah sí, son muy viejas', 50, 65),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
  })

  it('14. Alternate EN offer: "copper repiping" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The polybutylene pipes are failing throughout the house'),
      seg('speaker_0', 'Copper repiping is the solution for polybutylene systems'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. Alternate EN offer: "full repipe" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'All the pipes are old and the lead pipes are a health concern'),
      seg('speaker_0', 'A full repipe is the right call for safety'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('16. ES offer: "repipeo completo" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Las tuberías galvanizadas se están corroyendo por toda la casa'),
      seg('speaker_0', 'Le recomendamos un repipeo completo de la propiedad'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('17. jobType=null — whole-home-repiping rule still evaluates', () => {
    const result = rule.evaluate(ctx(
      [seg('speaker_1', 'The galvanized pipes and lead pipes are a major issue')],
      { jobType: null as any }
    ))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  it('18. Clip timestamp at startSec=0', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Galvanized pipes failing right at the start of our inspection', 0, 15),
      seg('speaker_0', 'I can see that', 15, 25),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(0)
  })

  it('19. Clip timestamp late in call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Most of the house looks okay', 0, 340),
      seg('speaker_1', 'Actually all the pipes are old in this wing at the end', 500, 545),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(500)
  })

  it('20. ES trigger only — Spanish missed opportunity', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Las tuberías galvanizadas y la tubería de plomo son un peligro', 0, 25),
      seg('speaker_0', 'Lo anotaré', 25, 40),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })
})
