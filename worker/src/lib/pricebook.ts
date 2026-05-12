import { db, pricebookItems } from '@kova/db'
import { and, eq } from 'drizzle-orm'
import type { ScoringDimension } from '@kova/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceResult {
  pricebookItemId: string | null
  valueLow: number
  valueHigh: number
  ltvValue: number | null
  isDefaultPrice: boolean
}

// ---------------------------------------------------------------------------
// Hardcoded CA market defaults (Phase 1 fallback)
// Phase 2: seed per-company defaults during onboarding
// ---------------------------------------------------------------------------

const DEFAULT_PRICES: Partial<Record<ScoringDimension, { valueLow: number; valueHigh: number; ltvValue?: number }>> = {
  camera_inspection:     { valueLow: 425,  valueHigh: 425 },
  preventive_plan:       { valueLow: 299,  valueHigh: 299,  ltvValue: 1495 },  // $299/yr × 5yr
  hydro_jetting:         { valueLow: 750,  valueHigh: 950 },
  drain_cleaning_upsell: { valueLow: 189,  valueHigh: 289 },
  pipe_repair:           { valueLow: 850,  valueHigh: 1500 },
  grease_trap:           { valueLow: 350,  valueHigh: 550 },
}

// ---------------------------------------------------------------------------
// lookupPrice
// ---------------------------------------------------------------------------

/**
 * Look up the price for an opportunity type.
 * Queries pricebook_items for the company first; falls back to hardcoded CA defaults.
 */
export async function lookupPrice(
  companyId: string,
  opportunityType: ScoringDimension,
): Promise<PriceResult> {
  const [item] = await db
    .select()
    .from(pricebookItems)
    .where(
      and(
        eq(pricebookItems.companyId, companyId),
        eq(pricebookItems.opportunityType, opportunityType),
      ),
    )

  if (item) {
    const valueLow = item.pricingModel === 'fixed' ? (item.priceFixed ?? 0) : (item.priceLow ?? 0)
    const valueHigh = item.pricingModel === 'fixed' ? (item.priceFixed ?? 0) : (item.priceHigh ?? 0)
    const ltvValue = item.isRecurring && item.ltvAnnual && item.ltvYears
      ? item.ltvAnnual * item.ltvYears
      : null
    return {
      pricebookItemId: item.id,
      valueLow,
      valueHigh,
      ltvValue,
      isDefaultPrice: item.isDefault,
    }
  }

  // Fall back to hardcoded CA market defaults
  const defaults = DEFAULT_PRICES[opportunityType]
  if (defaults) {
    return {
      pricebookItemId: null,
      valueLow: defaults.valueLow,
      valueHigh: defaults.valueHigh,
      ltvValue: defaults.ltvValue ?? null,
      isDefaultPrice: true,
    }
  }

  return { pricebookItemId: null, valueLow: 0, valueHigh: 0, ltvValue: null, isDefaultPrice: true }
}
