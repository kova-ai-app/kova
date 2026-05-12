import { describe, it, expect } from 'vitest'
import { assembleScore } from '../lib/score-assembly.js'
import type { RuleResult } from '@kova/shared'
import type { LLMAnalysis } from '../lib/llm.js'
import type { PriceResult } from '../lib/pricebook.js'

function ruleResult(overrides: Partial<RuleResult>): RuleResult {
  return {
    dimension: 'camera_inspection',
    triggered: false,
    offered: false,
    confidence: 0.95,
    ...overrides,
  }
}

const LLM_ALL_TWOS: LLMAnalysis = {
  qualScores: [
    { dimension: 'diagnosis_quality',     score: 2, reasoning: 'ok' },
    { dimension: 'hydrojet_presentation', score: 2, reasoning: 'ok' },
    { dimension: 'customer_education',    score: 2, reasoning: 'ok' },
    { dimension: 'close_quality',         score: 2, reasoning: 'ok' },
  ],
  tokensIn: 800,
  tokensOut: 200,
  costUsd: 0.0004,
}

const PRICE_CAMERA: PriceResult = { pricebookItemId: 'pb-1', valueLow: 425, valueHigh: 425, ltvValue: null, isDefaultPrice: false }
const PRICE_PLAN: PriceResult = { pricebookItemId: 'pb-2', valueLow: 299, valueHigh: 299, ltvValue: 1495, isDefaultPrice: false }

function priceMap(entries: [string, PriceResult][]): Map<string, PriceResult> {
  return new Map(entries)
}

describe('assembleScore', () => {
  it('1. camera_inspection triggered+offered → 3 pts → score=100, not in missed revenue', () => {
    const rules = [ruleResult({ dimension: 'camera_inspection', triggered: true, offered: true })]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    const camDim = result.dimensions.find((d) => d.dimension === 'camera_inspection')
    expect(camDim?.score).toBe(100)
    expect(result.opportunityTotalLow).toBe(0)  // offered = not missed
  })

  it('2. camera_inspection triggered+not_offered → 1 pt → score=33, counts as missed revenue', () => {
    const rules = [ruleResult({ dimension: 'camera_inspection', triggered: true, offered: false })]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    const camDim = result.dimensions.find((d) => d.dimension === 'camera_inspection')
    expect(camDim?.score).toBe(33)
    expect(result.opportunityTotalLow).toBe(425)
    expect(result.opportunityTotalHigh).toBe(425)
  })

  it('3. preventive_plan triggered+not_offered → ltvValue added to missed revenue totals', () => {
    const rules = [ruleResult({ dimension: 'preventive_plan', triggered: true, offered: false })]
    const prices = priceMap([['preventive_plan', PRICE_PLAN]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    expect(result.opportunityTotalLow).toBe(299)
    expect(result.opportunityTotalHigh).toBe(299)
    const opp = result.enrichedOpportunities.find((o) => o.dimension === 'preventive_plan')
    expect(opp?.ltvValue).toBe(1495)
  })

  it('4. suppressed rule result → 0 pts, NOT counted in missed revenue', () => {
    const rules = [ruleResult({ dimension: 'camera_inspection', triggered: false, offered: false, suppressedReason: 'emergency' })]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    expect(result.opportunityTotalLow).toBe(0)
    const camDim = result.dimensions.find((d) => d.dimension === 'camera_inspection')
    expect(camDim?.score).toBe(0)
  })

  it('5. LLM all-twos → each qualitative dim score = 67 (2/3 × 100)', () => {
    const result = assembleScore([], LLM_ALL_TWOS, priceMap([]))
    const diag = result.dimensions.find((d) => d.dimension === 'diagnosis_quality')
    expect(diag?.score).toBe(67)
  })

  it('6. overallScore = average of all 6 dim scores when LLM available', () => {
    // camera: triggered+offered → 100pts
    // preventive: triggered+offered → 100pts
    // LLM all-twos → 67 each × 4 = 268
    // avg: (100 + 100 + 67*4) / 6 = (200 + 268) / 6 = 468 / 6 = 78
    const rules = [
      ruleResult({ dimension: 'camera_inspection', triggered: true, offered: true }),
      ruleResult({ dimension: 'preventive_plan', triggered: true, offered: true }),
    ]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA], ['preventive_plan', PRICE_PLAN]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    expect(result.overallScore).toBe(78)
  })

  it('7. llmAnalysis=null → overallScore uses only rule dims; modelUsed=rules-v1', () => {
    // camera: triggered+offered → 100pts; no preventive rule
    // avg of 1 dim: 100
    const rules = [ruleResult({ dimension: 'camera_inspection', triggered: true, offered: true })]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA]])
    const result = assembleScore(rules, null, prices)
    expect(result.overallScore).toBe(100)
    expect(result.modelUsed).toBe('rules-v1')
    expect(result.confidenceLevel).toBe('medium')
  })

  it('8. enrichedOpportunities carry pricebookItemId + valueLow/High from priceMap', () => {
    const rules = [ruleResult({ dimension: 'camera_inspection', triggered: true, offered: false })]
    const prices = priceMap([['camera_inspection', PRICE_CAMERA]])
    const result = assembleScore(rules, LLM_ALL_TWOS, prices)
    const opp = result.enrichedOpportunities[0]
    expect(opp?.pricebookItemId).toBe('pb-1')
    expect(opp?.valueLow).toBe(425)
    expect(opp?.isDefaultPrice).toBe(false)
  })
})
