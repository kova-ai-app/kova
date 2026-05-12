import type { RuleResult } from '@kova/shared'
import type { RuleContext, ScoringRule } from './types.js'
import { CameraInspectionRule } from './camera-inspection.js'
import { MaintenancePlanRule } from './maintenance-plan.js'
import { DrainCleaningUpsellRule } from './drain-cleaning-upsell.js'
import { HydroJettingRule } from './hydro-jetting.js'
import { GreaseTrapRule } from './grease-trap.js'
import { PipeRepairRule } from './pipe-repair.js'
import { WaterHeaterRule } from './water-heater.js'
import { FixtureUpgradeRule } from './fixture-upgrade.js'
import { WaterFiltrationRule } from './water-filtration.js'
import { PressureRegulatorRule } from './pressure-regulator.js'
import { WholeHomeRepipingRule } from './whole-home-repiping.js'

// ---------------------------------------------------------------------------
// Rule registry — order does not affect scoring (each rule is independent)
// ---------------------------------------------------------------------------

const RULES: ScoringRule[] = [
  // Drain rules
  new CameraInspectionRule(),
  new MaintenancePlanRule(),
  new DrainCleaningUpsellRule(),
  new HydroJettingRule(),
  new GreaseTrapRule(),
  new PipeRepairRule(),
  // Plumbing rules
  new WaterHeaterRule(),
  new FixtureUpgradeRule(),
  new WaterFiltrationRule(),
  new PressureRegulatorRule(),
  new WholeHomeRepipingRule(),
]

// ---------------------------------------------------------------------------
// Suppression signals
// ---------------------------------------------------------------------------

const EMERGENCY_PHRASES = [
  'emergency', 'urgent', 'flooding', 'burst', 'sewage backup',
  'emergencia', 'urgente', 'inundación', 'tubería rota',
]

// NOTE: Substring matching is intentional for simplicity (Phase 1).
// Known limitations: 'burst' matches 'outburst', speaker-agnostic.
// TODO: Add word-boundary matching and speaker filtering in a future iteration.
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
        confidence: 0.95, // deterministic convention: all rule results are 0.95
        suppressedReason,
      }]
    }

    return [result]
  })
}
