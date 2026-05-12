import { NextResponse } from 'next/server'
import { db, users, companies } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function GET() {
  const authResult = await requireRole(['owner', 'manager', 'technician'])
  if (authResult instanceof NextResponse) return authResult
  const { orgId } = authResult

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const techs = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.companyId, company.id))

  return NextResponse.json(techs)
}
