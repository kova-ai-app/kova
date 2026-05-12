import { describe, it, expect } from 'vitest'
import { MaintenancePlanRule } from '../../lib/rules/maintenance-plan.js'
import type { RuleContext } from '../../lib/rules/types.js'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): import('@kova/shared').TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: import('@kova/shared').TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new MaintenancePlanRule()

describe('MaintenancePlanRule', () => {
  // --- Trigger + Offer -------------------------------------------------------

  it('1. EN: recurrence concern + maintenance plan offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This drain keeps backing up', 0, 4),
      seg('speaker_0', 'Let me tell you about our maintenance plan', 520, 525),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('2. EN: recurrence concern + service agreement → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'It backs up about twice a year', 0, 5),
      seg('speaker_0', 'We offer a service agreement that covers annual cleanings', 510, 516),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: recurrence concern + preventive plan → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Every year this happens', 0, 3),
      seg('speaker_0', 'You would benefit from our preventive plan', 580, 585),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  // --- Trigger without Offer (missed) ----------------------------------------

  it('4. EN: recurrence concern, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening every year', 0, 4),
      seg('speaker_0', 'I will clear it out for you today', 5, 9),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('5. EN: "same problem again" concern, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'It is the same problem again'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('6. EN: offer made too early (not in close window) → offered=false', () => {
    // Offer at 5s in a 600s call is NOT in the close window (last 40% = from 360s)
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 0, 4),
      seg('speaker_0', 'We have a maintenance plan available', 5, 9),
      seg('speaker_0', 'All done today', 590, 595),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  // --- No trigger, no offer --------------------------------------------------

  it('7. EN: no signals, no offer → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The sink is slow today'),
      seg('speaker_0', 'All cleared out, have a good day'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('8. EN: offer only (no trigger) → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'First time this happened'),
      seg('speaker_0', 'Would you like to hear about our maintenance plan?', 580, 585),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  // --- Spanish scenarios ------------------------------------------------------

  it('9. ES: recurrence concern + plan offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Esto pasa cada año', 0, 4),
      seg('speaker_0', 'Le puedo ofrecer nuestro plan de mantenimiento', 520, 526),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. ES: "el mismo problema otra vez" + acuerdo de servicio → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Es el mismo problema otra vez', 0, 4),
      seg('speaker_0', 'Tenemos un acuerdo de servicio anual disponible', 510, 517),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('11. ES: recurrence concern, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Esto siempre pasa'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. ES: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El drenaje estaba lento hoy'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  // --- Job type gating --------------------------------------------------------

  it('13. jobType=plumbing → returns null (not applicable to plumbing)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('14. jobType=both + trigger → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
      seg('speaker_0', 'We have a maintenance plan for that', 520, 525),
    ], { jobType: 'both' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. jobType=null → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening'),
    ], { jobType: null }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  // --- Close window boundary -------------------------------------------------

  it('16. offer exactly at 60% through call → offered=true (boundary: last 40%)', () => {
    // 60% of 600s = 360s — exactly at the start of the close window
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 0, 4),
      seg('speaker_0', 'Let me tell you about our maintenance plan', 360, 365),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('17. offer at 59% through call → offered=false (just outside window)', () => {
    // 59% of 600s = 354s — just before the close window
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 0, 4),
      seg('speaker_0', 'Let me mention the maintenance plan', 354, 359),
      seg('speaker_0', 'All done', 595, 600),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  // --- Offer phrase variants --------------------------------------------------

  it('18. "service plan" offer phrase → offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This happens twice a year', 0, 4),
      seg('speaker_0', 'We have a service plan that would prevent this', 500, 506),
    ]))
    expect(result?.offered).toBe(true)
  })

  it('19. "annual service" offer phrase → offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Again with this problem', 0, 4),
      seg('speaker_0', 'Would you like our annual service?', 510, 515),
    ]))
    expect(result?.offered).toBe(true)
  })

  // --- Clip timestamps --------------------------------------------------------

  it('20. clipStartSec set to first trigger, clipEndSec to last offer segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This keeps happening', 30, 35),
      seg('speaker_0', 'We offer a maintenance plan', 520, 525),
    ]))
    expect(result?.clipStartSec).toBe(30)
    expect(result?.clipEndSec).toBe(525)
  })
})
