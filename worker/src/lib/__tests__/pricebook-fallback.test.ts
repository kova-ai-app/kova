import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kova/db', () => ({
  db: { select: vi.fn() },
  pricebookItems: {},
}))
vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
}))

import { db } from '@kova/db'
import { lookupPrice } from '../pricebook.js'
import { DEFAULT_PRICEBOOK_ITEMS } from '@kova/shared'

describe('lookupPrice fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to shared DEFAULT_PRICEBOOK_ITEMS for all 11 opportunity types', async () => {
    // No DB rows for any type
    ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    for (const item of DEFAULT_PRICEBOOK_ITEMS) {
      const result = await lookupPrice('comp-1', item.opportunityType)
      expect(result.isDefaultPrice).toBe(true)
      expect(result.pricebookItemId).toBeNull()

      if (item.pricingModel === 'fixed') {
        expect(result.valueLow).toBe(item.priceFixed)
        expect(result.valueHigh).toBe(item.priceFixed)
      } else {
        expect(result.valueLow).toBe(item.priceLow)
        expect(result.valueHigh).toBe(item.priceHigh)
      }

      if (item.isRecurring && item.ltvAnnual && item.ltvYears) {
        expect(result.ltvValue).toBe(item.ltvAnnual * item.ltvYears)
      }
    }
  })
})
