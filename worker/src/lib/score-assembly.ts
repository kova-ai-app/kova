import type { RuleResult, DimensionScore, ScoringDimension } from '@kova/shared'
import type { LLMAnalysis } from './llm.js'
import type { PriceResult } from './pricebook.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichedOpportunity {
  dimension: ScoringDimension
  triggered: boolean
  offered: boolean
  confidence: number
  suppressedReason?: 'emergency' | 'short_call'
  clipStartSec?: number
  clipEndSec?: number
  pricebookItemId: string | null
  valueLow: number
  valueHigh: number
  ltvValue: number | null
  isDefaultPrice: boolean
}

export interface AssembledScore {
  overallScore: number
  dimensions: DimensionScore[]
  opportunityTotalLow: number
  opportunityTotalHigh: number
  enrichedOpportunities: EnrichedOpportunity[]
  modelUsed: string
  confidenceLevel: 'high' | 'medium' | 'low'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert 0–3 rule points to a 0–100 dimension score. */
function rulePointsToScore(pts: number): number {
  return Math.round((pts / 3) * 100)
}

/** Convert 0–3 LLM score to 0–100 dimension score. */
function llmScoreToHundred(score: number): number {
  return Math.round((score / 3) * 100)
}

/** Calculate rule-based points for a dimension from its triggered/offered/suppressed state. */
function rulePoints(rr: RuleResult): number {
  if (rr.suppressedReason) return 0
  if (!rr.triggered && !rr.offered) return 0
  if (!rr.triggered && rr.offered) return 2   // proactive — tech offered unprompted
  if (rr.triggered && !rr.offered) return 1   // missed opportunity
  return 3                                      // triggered + offered = full credit
}

// ---------------------------------------------------------------------------
// assembleScore (pure function — no async calls)
// ---------------------------------------------------------------------------

/**
 * Combine rule results + LLM qualitative scores + price lookups into a final score.
 *
 * @param ruleResults  RuleResult[] from runRules — may be empty
 * @param llmAnalysis  LLMAnalysis from analyzeTranscript — null if LLM unavailable
 * @param priceMap     Map<ScoringDimension, PriceResult> pre-fetched from lookupPrice
 */
export function assembleScore(
  ruleResults: RuleResult[],
  llmAnalysis: LLMAnalysis | null,
  priceMap: Map<string, PriceResult>,
): AssembledScore {
  const dimensions: DimensionScore[] = []
  let opportunityTotalLow = 0
  let opportunityTotalHigh = 0
  const enrichedOpportunities: EnrichedOpportunity[] = []

  // --- Rule-based dimensions -------------------------------------------------

  for (const rr of ruleResults) {
    const pts = rulePoints(rr)
    const score = rulePointsToScore(pts)

    dimensions.push({
      dimension: rr.dimension,
      score,
      triggered: rr.triggered,
      offered: rr.offered,
      confidence: rr.confidence,
    })

    const price = priceMap.get(rr.dimension) ?? {
      pricebookItemId: null, valueLow: 0, valueHigh: 0, ltvValue: null, isDefaultPrice: true,
    }

    // Count missed revenue: triggered but not offered and not suppressed
    if (rr.triggered && !rr.offered && !rr.suppressedReason) {
      opportunityTotalLow += price.valueLow
      opportunityTotalHigh += price.valueHigh
    }

    enrichedOpportunities.push({
      dimension: rr.dimension,
      triggered: rr.triggered,
      offered: rr.offered,
      confidence: rr.confidence,
      suppressedReason: rr.suppressedReason,
      ...(rr.clipStartSec !== undefined && { clipStartSec: rr.clipStartSec }),
      ...(rr.clipEndSec !== undefined && { clipEndSec: rr.clipEndSec }),
      pricebookItemId: price.pricebookItemId,
      valueLow: price.valueLow,
      valueHigh: price.valueHigh,
      ltvValue: price.ltvValue,
      isDefaultPrice: price.isDefaultPrice,
    })
  }

  // --- LLM qualitative dimensions --------------------------------------------

  if (llmAnalysis) {
    for (const qs of llmAnalysis.qualScores) {
      dimensions.push({
        dimension: qs.dimension,
        score: llmScoreToHundred(qs.score),
        triggered: false,
        offered: false,
        confidence: 0.85,  // LLM outputs are less deterministic than rules
        reasoning: qs.reasoning,
      })
    }
  }

  // --- Overall score ---------------------------------------------------------

  const overallScore =
    dimensions.length > 0
      ? Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length)
      : 0

  const modelUsed = llmAnalysis ? 'rules+gpt-4o-mini' : 'rules-v1'
  const confidenceLevel: 'high' | 'medium' | 'low' = llmAnalysis ? 'high' : 'medium'

  return {
    overallScore,
    dimensions,
    opportunityTotalLow,
    opportunityTotalHigh,
    enrichedOpportunities,
    modelUsed,
    confidenceLevel,
  }
}
