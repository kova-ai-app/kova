import { NextResponse } from 'next/server'
import { db, calls, scores, users, companies } from '@kova/db'
import { and, desc, eq, sql } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

const PAGE_SIZE = 20

export async function GET(request: Request) {
  const authResult = await requireRole(['owner', 'manager', 'technician'])
  if (authResult instanceof NextResponse) return authResult
  const { clerkUserId, orgId, role } = authResult

  // Look up company
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))

  // Technicians only see their own calls — resolve their DB user record
  let whereClause = eq(calls.companyId, company.id)
  if (role === 'technician') {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    whereClause = and(eq(calls.companyId, company.id), eq(calls.techId, user.id))!
  }

  const [callsList, countResult] = await Promise.all([
    db
      .select({
        id: calls.id,
        techId: calls.techId,
        recordedAt: calls.recordedAt,
        durationSec: calls.durationSec,
        status: calls.status,
        jobType: calls.jobType,
        customerName: calls.customerName,
        overallScore: scores.overallScore,
        opportunityTotalLow: scores.opportunityTotalLow,
        opportunityTotalHigh: scores.opportunityTotalHigh,
      })
      .from(calls)
      .leftJoin(scores, eq(scores.id, calls.scoreId))
      .where(whereClause)
      .orderBy(desc(calls.recordedAt))
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)` })
      .from(calls)
      .where(whereClause),
  ])

  const total = Number(countResult[0]?.count ?? 0)

  return NextResponse.json({
    data: callsList,
    nextPage: (page + 1) * PAGE_SIZE < total ? page + 1 : null,
    total,
  })
}
