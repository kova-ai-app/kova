import { NextResponse } from 'next/server'
import { db, pricebookItems } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['owner'])
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
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

  if (!updated) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['owner'])
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  await db
    .update(pricebookItems)
    .set({ active: false })
    .where(eq(pricebookItems.id, id))

  return new NextResponse(null, { status: 204 })
}
