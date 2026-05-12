import { describe, it, expect } from 'vitest'
import { CameraInspectionRule } from '../../lib/rules/camera-inspection.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new CameraInspectionRule()

describe('CameraInspectionRule', () => {
  // --- Trigger + Offer -------------------------------------------------------

  it('1. EN: recurrence signal + offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening every few months'),
      seg('speaker_0', 'We should do a camera inspection to see what is going on'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: prior visit signal + camera scope → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We had someone out for this before'),
      seg('speaker_0', 'I recommend running a camera scope on your line'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: older home signal + video inspection → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The house was built in 1965'),
      seg('speaker_0', 'Let me do a video inspection of your pipes'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  // --- Trigger without Offer (missed opportunity) ----------------------------

  it('4. EN: recurrence signal, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'It backs up about twice a year'),
      seg('speaker_0', 'I will snake it out for you today'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('5. EN: "third time this year" signal, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This is the third time this year I have called'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('6. EN: prior service signal only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Prior service was done on this drain six months ago'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  // --- No trigger, no offer --------------------------------------------------

  it('7. EN: no signals, no offer → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The sink is slow today'),
      seg('speaker_0', 'I can clear this right now'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('8. EN: offer with no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Just a little slow'),
      seg('speaker_0', 'Would you like a camera inspection while I am here?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  // --- Spanish scenarios ------------------------------------------------------

  it('9. ES: recurrence signal + offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Esto pasa cada pocos meses', 0, 4),
      seg('speaker_0', 'Le recomiendo una inspección con cámara', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. ES: prior visit signal ("antes") + camera offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Ya vinieron antes por esto mismo'),
      seg('speaker_0', 'Vamos a hacer una cámara de video para inspeccionar'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('11. ES: recurrence signal, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Esto pasa repetidamente'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. ES: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El drenaje está un poco lento hoy'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  // --- Job type gating --------------------------------------------------------

  it('13. jobType=plumbing → returns null (not applicable)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('14. jobType=both + recurrence → triggered=true (applies to both)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening every year'),
      seg('speaker_0', 'I recommend a camera inspection'),
    ], { jobType: 'both' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. jobType=null → applies (treat as unknown, run the rule)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
    ], { jobType: null }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  // --- Clip timestamps --------------------------------------------------------

  it('16. clipStartSec set to the first trigger segment start', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 30, 35),
      seg('speaker_0', 'We should do a camera inspection', 36, 40),
    ]))
    expect(result?.clipStartSec).toBe(30)
    expect(result?.clipEndSec).toBe(40)
  })

  // --- Mixed language (bilingual call) ----------------------------------------

  it('17. EN trigger in ES call → triggered=true (keyword matching is language-agnostic)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 0, 3),
      seg('speaker_0', 'El drenaje está bien', 4, 7),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
  })

  // --- Offer keyword variants -------------------------------------------------

  it('18. "run a camera" offer phrase → offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Had someone out last year'),
      seg('speaker_0', 'Let me run a camera down that line'),
    ]))
    expect(result?.offered).toBe(true)
  })

  it('19. "scope the line" offer phrase → offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Prior service was done here'),
      seg('speaker_0', 'I want to scope the line to find the issue'),
    ]))
    expect(result?.offered).toBe(true)
  })

  it('20. Partial word "camer" does NOT match (avoid false positives on partial words)', () => {
    // "camer" alone should not trigger the offer phrase
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
      seg('speaker_0', 'The camer is not needed today'),
    ]))
    expect(result?.offered).toBe(false)
  })
})
