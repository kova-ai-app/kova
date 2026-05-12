import { NextResponse } from 'next/server'
import { db, pricebookItems, companies } from '@kova/db'
import { desc, eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'
import type { PricebookItemInput } from '@kova/shared'

export async function GET(_request: Request) {
  const authResult = await requireRole(['owner', 'manager'])
  if (authResult instanceof NextResponse) return authResult
  const { orgId } = authResult

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const items = await db
    .select()
    .from(pricebookItems)
    .where(eq(pricebookItems.companyId, company.id))
    .orderBy(desc(pricebookItems.createdAt))

  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const authResult = await requireRole(['owner'])
  if (authResult instanceof NextResponse) return authResult
  const { orgId } = authResult

  const body = (await request.json()) as PricebookItemInput

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.trade || !body.opportunityType || !body.pricingModel) {
    return NextResponse.json(
      { error: 'trade, opportunityType, and pricingModel are required' },
      { status: 400 }
    )
  }

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const [item] = await db
    .insert(pricebookItems)
    .values({
      companyId: company.id,
      name: body.name.trim(),
      trade: body.trade,
      opportunityType: body.opportunityType,
      pricingModel: body.pricingModel,
      priceFixed: body.priceFixed ?? null,
      priceLow: body.priceLow ?? null,
      priceHigh: body.priceHigh ?? null,
      isRecurring: body.isRecurring ?? false,
      ltvAnnual: body.ltvAnnual ?? null,
      ltvYears: body.ltvYears ?? null,
      isDefault: false,
      active: true,
    })
    .returning()

  return NextResponse.json(item, { status: 201 })
}
