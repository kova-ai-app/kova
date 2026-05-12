import type { RuleResult } from '@kova/shared'
import type { RuleContext, ScoringRule } from './types.js'
import { CameraInspectionRule } from './camera-inspection.js'
import { MaintenancePlanRule } from './maintenance-plan.js'

// ---------------------------------------------------------------------------
// Rule registry
// ---------------------------------------------------------------------------

const RULES: ScoringRule[] = [
  new CameraInspectionRule(),
  new MaintenancePlanRule(),
]

// ---------------------------------------------------------------------------
// Suppression signals
// ---------------------------------------------------------------------------

const EMERGENCY_PHRASES = [
  'emergency', 'urgent', 'flooding', 'burst', 'sewage backup',
  'emergencia', 'urgente', 'inundación', 'tubería rota',
]

function hasEmergencySignal(ctx: RuleContext): boolean {
  const lower = ctx.segments.map((s) => s.text.toLowerCase()).join(' ')
  return EMERGENCY_PHRASES.some((p) => lower.includes(p))
}

const SHORT_CALL_THRESHOLD_SEC = 480 // 8 minutes

// ---------------------------------------------------------------------------
// runRules
// ---------------------------------------------------------------------------

/**
 * Run all scoring rules against the transcript context.
 * Returns RuleResult[] — null results (rule not applicable) are filtered out.
 * Applies contextual suppression before evaluating individual rules.
 */
export function runRules(ctx: RuleContext): RuleResult[] {
  const suppressedReason: 'emergency' | 'short_call' | undefined =
    hasEmergencySignal(ctx)
      ? 'emergency'
      : ctx.durationSec < SHORT_CALL_THRESHOLD_SEC
        ? 'short_call'
        : undefined

  return RULES.flatMap((rule): RuleResult[] => {
    const result = rule.evaluate(ctx)
    if (result === null) return []

    if (suppressedReason) {
      return [{
        dimension: result.dimension,
        triggered: false,
        offered: false,
        confidence: 0.95,
        suppressedReason,
      }]
    }

    return [result]
  })
}
