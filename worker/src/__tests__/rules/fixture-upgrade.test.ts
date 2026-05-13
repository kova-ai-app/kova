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

  it('11. Multiple EN triggers strengthen evidence', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The dripping faucet in the kitchen is bad'),
      seg('speaker_1', 'And the old faucet in the bathroom is also dripping'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })

  it('12. Partial word does not false-positive: "fixed" ≠ fixture trigger', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'The issue was fixed last week'),
      seg('speaker_1', 'Great to hear'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(false)
  })

  it('13. Mixed bilingual: EN trigger in mostly-ES call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Los baños están bien', 0, 20),
      seg('speaker_0', 'But the kitchen has a dripping faucet here', 20, 45),
      seg('speaker_1', 'Sí, lo noto', 45, 55),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
  })

  it('14. Alternate EN offer: "new showerhead" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The showerhead dripping has been going on for months'),
      seg('speaker_0', 'A new showerhead would solve that easily'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('15. Alternate EN offer: "toilet upgrade" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'The running toilet is wasting a lot of water'),
      seg('speaker_0', 'A toilet upgrade to a low-flow model is what you need'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('16. ES offer: "grifería nueva" recognized', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El grifo que gotea en la cocina es un problema'),
      seg('speaker_0', 'Le puedo instalar grifería nueva hoy mismo'),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(true)
  })

  it('17. jobType=null — fixture-upgrade rule still evaluates', () => {
    const result = rule.evaluate(ctx(
      [seg('speaker_1', 'The dripping faucet and old faucet need attention')],
      { jobType: null as any }
    ))
    expect(result).not.toBeNull()
    expect(result?.triggered).toBe(true)
  })

  it('18. Clip timestamp at startSec=0', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'Dripping faucet right when I walked in', 0, 10),
      seg('speaker_0', 'I see it', 10, 20),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(0)
  })

  it('19. Clip timestamp late in call', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_0', 'Everything checks out', 0, 360),
      seg('speaker_1', 'Actually the running toilet just started again at the end', 490, 530),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.clipStartSec).toBe(490)
  })

  it('20. ES trigger only — Spanish missed opportunity', () => {
    const result = rule.evaluate(ctx([
      seg('speaker_1', 'El grifo que gotea y la grifería vieja del baño son problemas', 0, 25),
      seg('speaker_0', 'Revisaré todo', 25, 40),
    ], { jobType: 'plumbing' }))
    expect(result?.triggered).toBe(true)
    expect(result?.offered).toBe(false)
  })
})
