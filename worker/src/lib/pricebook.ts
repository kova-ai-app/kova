import { db, pricebookItems } from '@kova/db'
import { and, eq } from 'drizzle-orm'
import type { ScoringDimension } from '@kova/shared'
import { DEFAULT_PRICEBOOK_ITEMS } from '@kova/shared'

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
// Build fallback map from shared defaults (single source of truth)
// ---------------------------------------------------------------------------

const DEFAULT_PRICE_MAP = new Map(
  DEFAULT_PRICEBOOK_ITEMS.map((item) => [
    item.opportunityType,
    {
      valueLow: item.pricingModel === 'fixed' ? (item.priceFixed ?? 0) : (item.priceLow ?? 0),
      valueHigh: item.pricingModel === 'fixed' ? (item.priceFixed ?? 0) : (item.priceHigh ?? 0),
      ltvValue:
        item.isRecurring && item.ltvAnnual && item.ltvYears
          ? item.ltvAnnual * item.ltvYears
          : null,
    },
  ])
)

// ---------------------------------------------------------------------------
// lookupPrice
// ---------------------------------------------------------------------------

/**
 * Look up the price for an opportunity type.
 * Queries pricebook_items for the company first; falls back to shared defaults.
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

  // Fall back to shared defaults (California industry averages)
  const defaults = DEFAULT_PRICE_MAP.get(opportunityType)
  if (defaults) {
    return {
      pricebookItemId: null,
      ...defaults,
      isDefaultPrice: true,
    }
  }

  return { pricebookItemId: null, valueLow: 0, valueHigh: 0, ltvValue: null, isDefaultPrice: true }
}
