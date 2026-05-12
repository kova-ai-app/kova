import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kova/db', () => ({
  db: { select: vi.fn() },
  pricebookItems: {},
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn() }))

import { db } from '@kova/db'
import { lookupPrice } from '../lib/pricebook.js'

const MOCK_CAMERA_ITEM = {
  id: 'pb-1',
  pricingModel: 'fixed',
  priceFixed: 425,
  priceLow: null,
  priceHigh: null,
  isRecurring: false,
  ltvAnnual: null,
  ltvYears: null,
  isDefault: false,
}

const MOCK_PLAN_ITEM = {
  id: 'pb-2',
  pricingModel: 'fixed',
  priceFixed: 299,
  priceLow: null,
  priceHigh: null,
  isRecurring: true,
  ltvAnnual: 299,
  ltvYears: 5,
  isDefault: false,
}

const MOCK_HYDRO_ITEM = {
  id: 'pb-3',
  pricingModel: 'range',
  priceFixed: null,
  priceLow: 750,
  priceHigh: 950,
  isRecurring: false,
  ltvAnnual: null,
  ltvYears: null,
  isDefault: false,
}

function mockDbSelect(returnValue: object | null) {
  ;(db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(returnValue ? [returnValue] : []),
    }),
  })
}

describe('lookupPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. returns fixed price from pricebook_items when company has the item', async () => {
    mockDbSelect(MOCK_CAMERA_ITEM)
    const result = await lookupPrice('co-1', 'camera_inspection')
    expect(result.valueLow).toBe(425)
    expect(result.valueHigh).toBe(425)
    expect(result.isDefaultPrice).toBe(false)
    expect(result.pricebookItemId).toBe('pb-1')
  })

  it('2. returns range price from pricebook_items (pricingModel=range)', async () => {
    mockDbSelect(MOCK_HYDRO_ITEM)
    const result = await lookupPrice('co-1', 'hydro_jetting')
    expect(result.valueLow).toBe(750)
    expect(result.valueHigh).toBe(950)
    expect(result.isDefaultPrice).toBe(false)
  })

  it('3. calculates ltvValue for recurring items (annual * years)', async () => {
    mockDbSelect(MOCK_PLAN_ITEM)
    const result = await lookupPrice('co-1', 'preventive_plan')
    expect(result.ltvValue).toBe(1495)  // 299 * 5
    expect(result.valueLow).toBe(299)
  })

  it('4. falls back to shared default when no pricebook item found', async () => {
    mockDbSelect(null)
    const result = await lookupPrice('co-1', 'camera_inspection')
    expect(result.valueLow).toBe(199)
    expect(result.valueHigh).toBe(199)
    expect(result.isDefaultPrice).toBe(true)
    expect(result.pricebookItemId).toBeNull()
  })

  it('5. returns shared default for plumbing opportunity type with no pricebook item', async () => {
    mockDbSelect(null)
    const result = await lookupPrice('co-1', 'whole_home_repiping')
    expect(result.valueLow).toBe(4000)
    expect(result.valueHigh).toBe(12000)
    expect(result.isDefaultPrice).toBe(true)
    expect(result.pricebookItemId).toBeNull()
  })
})
