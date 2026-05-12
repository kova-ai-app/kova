import { NextResponse } from 'next/server'
import { db, companies } from '@kova/db'
import { eq } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard'

export async function GET(_request: Request) {
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

  const getCachedSummary = unstable_cache(
    () => getDashboardData(company.id),
    [`dashboard-summary-${company.id}`],
    { revalidate: 300 }
  )

  const summary = await getCachedSummary()
  return NextResponse.json(summary)
}
