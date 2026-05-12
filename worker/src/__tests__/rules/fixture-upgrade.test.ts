import { describe, it, expect } from 'vitest'
import { FixtureUpgradeRule } from '../../lib/rules/fixture-upgrade.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

function ctx(segments: TranscriptSegment[], overrides: Partial<RuleContext> = {}): RuleContext {
  return { segments, jobType: 'plumbing', durationSec: 600, language: 'en', ...overrides }
}

const rule = new FixtureUpgradeRule()

describe('FixtureUpgradeRule', () => {
  it('1. EN: dripping faucet trigger + new faucet offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The kitchen faucet has been dripping for weeks and it drives me crazy'),
      seg('speaker_0', 'We can replace that with a new faucet today, much better flow'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
    expect(result?.confidence).toBeCloseTo(0.95)
  })

  it('2. EN: running toilet trigger + toilet upgrade offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The toilet keeps running after you flush, it never fully stops'),
      seg('speaker_0', 'I recommend a toilet upgrade — newer models use much less water'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('3. EN: trigger only, no offer → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'This old faucet has been leaking tap water all day'),
      seg('speaker_0', 'Let me check the washers and see if I can fix the seal'),
    ]))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('4. EN: offer only, no trigger → triggered=false, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'While I am here, would you like a fixture upgrade on that bathroom?'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(true)
  })

  it('5. EN: no signals → triggered=false, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Water pressure is a little low today'),
      seg('speaker_0', 'I will check the main shutoff'),
    ]))
    expect(result?.triggered).toBe(false)
    expect(result?.offered).toBe(false)
  })

  it('6. ES: dripping faucet trigger + new faucet offer → triggered=true, offered=true', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El grifo que gotea en la cocina desperdicia mucha agua', 0, 5),
      seg('speaker_0', 'Le podemos poner un grifo nuevo con mejor tecnología', 6, 10),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('7. ES: running toilet trigger only → triggered=true, offered=false', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El inodoro corriendo toda la noche y consume mucha agua'),
    ], { language: 'es' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('8. jobType=drain → returns null', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Dripping faucet problem'),
      seg('speaker_0', 'New fixture for you'),
    ], { jobType: 'drain' }))
    expect(result).toBeNull()
  })

  it('9. jobType=both + trigger + offer → applies', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The showerhead is dripping and the toilet leak is ongoing'),
      seg('speaker_0', 'Let me install a new showerhead and replace the toilet internals'),
    ], { jobType: 'both' }))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('10. clipStartSec set from first trigger segment', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The bathroom faucet is dripping tap all day and night', 12, 17),
      seg('speaker_0', 'Let us upgrade the fixture to stop the waste', 18, 22),
    ]))
    expect(result?.clipStartSec).toBe(12)
    expect(result?.clipEndSec).toBe(22)
  })
})
