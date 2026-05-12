import { describe, it, expect } from 'vitest'
import { PipeRepairRule } from '../../lib/rules/pipe-repair.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new PipeRepairRule()

describe('PipeRepairRule', () => {
  it('1. EN: broken pipe trigger + pipe repair offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The camera showed a broken pipe under the foundation'),
      seg('speaker_0', 'We can do a pipe repair using trenchless methods'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: bellied pipe trigger + pipe lining offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'We have a bellied pipe section that is holding water'),
      seg('speaker_0', 'Pipe lining is the best solution to fix that belly'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The camera showed a cracked pipe in the main line'),
      seg('speaker_0', 'I will write up the report and we can go from there'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'We could do a spot repair on any damaged section we find'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The drain is a little slow'),
      seg('speaker_0', 'Nothing unusual in the camera'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: pipe damage trigger + repair offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'La cámara mostró que la tubería está agrietada', 0, 4),
      seg('speaker_0', 'Podemos hacer una reparación sin zanja para arreglarla', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: collapsed pipe trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'La tubería colapsada no deja pasar nada'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=plumbing → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Broken pipe under the house'),
      seg('speaker_0', 'We can do pipe repair'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Root intrusion cracked the main pipe'),
      seg('speaker_0', 'CIPP lining will seal that pipe without digging'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec is set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The pipe is deteriorating and has corrosion all through it', 60, 65),
      seg('speaker_0', 'We should reline the pipe to seal everything', 66, 70),
    ]))
    expect(result?.clipStartSec).toBe(60)
    expect(result?.clipEndSec).toBe(70)
  })
})
