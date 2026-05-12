import type { TranscriptSegment, RuleResult, ScoringDimension, JobType } from '@kova/shared'

export interface RuleContext {
  segments: TranscriptSegment[]
  jobType: JobType | null
  durationSec: number
  language: 'en' | 'es' | 'unknown'
}

export interface ScoringRule {
  dimension: ScoringDimension
  /** Returns null if this rule does not apply to the given jobType */
  evaluate(ctx: RuleContext): RuleResult | null
}
