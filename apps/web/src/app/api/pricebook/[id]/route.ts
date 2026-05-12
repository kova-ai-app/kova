import { NextResponse } from 'next/server'
import { db, pricebookItems } from '@kova/db'
import { eq, and } from 'drizzle-orm'
import { getAuthWithCompany } from '@/lib/auth'
import { withErrorHandler } from '@/lib/api-handler'

export const PUT = withErrorHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { auth, error } = await getAuthWithCompany(['owner'])
  if (error) return error

  const { id } = await params

  // Verify item belongs to this company before updating
  const [item] = await db
    .select({ id: pricebookItems.id })
    .from(pricebookItems)
    .where(and(eq(pricebookItems.id, id), eq(pricebookItems.companyId, auth.companyId)))

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()

  const [updated] = await db
    .update(pricebookItems)
    .set({
      ...(body.name != null ? { name: body.name.trim() } : {}),
      ...(body.trade != null ? { trade: body.trade } : {}),
      ...(body.opportunityType != null ? { opportunityType: body.opportunityType } : {}),
      ...(body.pricingModel != null ? { pricingModel: body.pricingModel } : {}),
      ...(body.priceFixed !== undefined ? { priceFixed: body.priceFixed } : {}),
      ...(body.priceLow !== undefined ? { priceLow: body.priceLow } : {}),
      ...(body.priceHigh !== undefined ? { priceHigh: body.priceHigh } : {}),
      ...(body.isRecurring != null ? { isRecurring: body.isRecurring } : {}),
      ...(body.ltvAnnual !== undefined ? { ltvAnnual: body.ltvAnnual } : {}),
      ...(body.ltvYears !== undefined ? { ltvYears: body.ltvYears } : {}),
      // When owner customizes a default item, mark it as no longer default
      isDefault: false,
    })
    .where(eq(pricebookItems.id, id))
    .returning()

  return NextResponse.json(updated)
})

export const DELETE = withErrorHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { auth, error } = await getAuthWithCompany(['owner'])
  if (error) return error

  const { id } = await params

  // Verify item belongs to this company before deleting
  const [item] = await db
    .select({ id: pricebookItems.id })
    .from(pricebookItems)
    .where(and(eq(pricebookItems.id, id), eq(pricebookItems.companyId, auth.companyId)))

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .update(pricebookItems)
    .set({ active: false })
    .where(eq(pricebookItems.id, id))

  return new NextResponse(null, { status: 204 })
})
