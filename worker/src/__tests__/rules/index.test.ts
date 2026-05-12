import { describe, it, expect } from 'vitest'
import { runRules } from '../../lib/rules/index.js'
import type { RuleContext } from '../../lib/rules/types.js'
import type { TranscriptSegment } from '@kova/shared'

function seg(speaker: string, text: string, startSec = 0, endSec = 5): TranscriptSegment {
  return { speaker, text, startSec, endSec, language: 'en', confidence: 0.95 }
}

describe('runRules', () => {
  it('returns results for both rules on a standard drain call', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'This keeps happening every year', 0, 4),
        seg('speaker_0', 'I recommend a camera inspection', 5, 10),
        seg('speaker_0', 'We have a maintenance plan available', 520, 526),
      ],
      jobType: 'drain',
      durationSec: 600,
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results).toHaveLength(2)
    const camera = results.find((r) => r.dimension === 'camera_inspection')
    const plan = results.find((r) => r.dimension === 'preventive_plan')
    expect(camera?.triggered).toBe(true)
    expect(camera?.offered).toBe(true)
    expect(plan?.triggered).toBe(true)
    expect(plan?.offered).toBe(true)
  })

  it('returns null-filtered results for plumbing (both rules return null)', () => {
    const ctx: RuleContext = {
      segments: [seg('speaker_1', 'The water heater is old')],
      jobType: 'plumbing',
      durationSec: 600,
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results).toHaveLength(0)
  })

  it('applies emergency suppression — all results marked suppressedReason=emergency', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'We have a flooding emergency right now', 0, 4),
        seg('speaker_1', 'This keeps happening every year', 5, 9),
        seg('speaker_0', 'I recommend a camera inspection', 10, 14),
      ],
      jobType: 'drain',
      durationSec: 600,
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results.every((r) => r.suppressedReason === 'emergency')).toBe(true)
    expect(results.every((r) => r.triggered === false)).toBe(true)
    expect(results.every((r) => r.offered === false)).toBe(true)
  })

  it('applies ES emergency suppression (emergencia)', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'Es una emergencia, hay agua por todos lados', 0, 5),
      ],
      jobType: 'drain',
      durationSec: 600,
      language: 'es',
    }
    const results = runRules(ctx)
    expect(results.every((r) => r.suppressedReason === 'emergency')).toBe(true)
  })

  it('applies short-call suppression — results marked suppressedReason=short_call when < 8 min', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'This keeps happening', 0, 4),
        seg('speaker_0', 'Camera inspection recommended', 5, 9),
      ],
      jobType: 'drain',
      durationSec: 400, // < 480s threshold
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results.every((r) => r.suppressedReason === 'short_call')).toBe(true)
  })

  it('does NOT suppress calls at exactly 480 seconds', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'This keeps happening', 0, 4),
      ],
      jobType: 'drain',
      durationSec: 480,
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results.every((r) => r.suppressedReason === undefined)).toBe(true)
  })

  it('emergency suppression takes priority over short-call suppression', () => {
    const ctx: RuleContext = {
      segments: [
        seg('speaker_1', 'flooding emergency', 0, 3),
      ],
      jobType: 'drain',
      durationSec: 300,
      language: 'en',
    }
    const results = runRules(ctx)
    expect(results.every((r) => r.suppressedReason === 'emergency')).toBe(true)
  })
})
