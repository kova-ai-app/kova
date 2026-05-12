import { describe, it, expect } from 'vitest'
import { DrainCleaningUpsellRule } from '../../lib/rules/drain-cleaning-upsell.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'drain', durationSec: 600, language: 'en', ...overrides }
}

const rule = new DrainCleaningUpsellRule()

describe('DrainCleaningUpsellRule', () => {
  it('1. EN: slow drain trigger + enzyme treatment offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The drain is slow and has been slow for a while'),
      seg('speaker_0', 'I recommend an enzyme treatment to keep it clear long term'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: clogged trigger + bio-clean offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The kitchen drain is completely clogged'),
      seg('speaker_0', 'We can apply bio-clean after the snake to prevent buildup'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The bathroom drain is backing up'),
      seg('speaker_0', 'I will clear that out with the snake right now'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Would you like a drain treatment to keep everything flowing?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Everything seems fine in here'),
      seg('speaker_0', 'All good, just a routine inspection'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: trigger + offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El drenaje está muy lento y no drena bien', 0, 4),
      seg('speaker_0', 'Le recomiendo un tratamiento enzimático para limpiar la línea', 5, 9),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El desagüe está atascado y no pasa el agua'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=plumbing → returns null (drain rule, not applicable)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The drain is slow'),
      seg('speaker_0', 'Bio-clean will help'),
    ], { jobType: 'plumbing' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger → triggered=true (applies to both)', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The drain is backed up'),
      seg('speaker_0', 'I can do an enzyme treatment'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  it('10. clipStartSec set to first trigger segment start', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The drain is not draining at all', 20, 25),
      seg('speaker_0', 'I will use bio-clean after snaking', 26, 30),
    ]))
    expect(result?.clipStartSec).toBe(20)
    expect(result?.clipEndSec).toBe(30)
  })
})
