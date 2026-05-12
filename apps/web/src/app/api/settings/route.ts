import { NextResponse } from 'next/server'
import { db, companies } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function GET(_request: Request) {
  const authResult = await requireRole(['owner', 'manager'])
  if (authResult instanceof NextResponse) return authResult
  const { orgId } = authResult

  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      state: companies.state,
      plan: companies.plan,
    })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json(company)
}

export async function PATCH(request: Request) {
  const authResult = await requireRole(['owner'])
  if (authResult instanceof NextResponse) return authResult
  const { orgId } = authResult

  const body = (await request.json()) as { name?: string; state?: string }

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const [updated] = await db
    .update(companies)
    .set({
      ...(body.name?.trim() ? { name: body.name.trim() } : {}),
      ...(body.state ? { state: body.state } : {}),
    })
    .where(eq(companies.id, company.id))
    .returning({
      id: companies.id,
      name: companies.name,
      state: companies.state,
      plan: companies.plan,
    })

  return NextResponse.json(updated)
}
