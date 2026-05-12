import { NextResponse } from 'next/server'
import { db, calls, scores, users, companies } from '@kova/db'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'
import { withErrorHandler } from '@/lib/api-handler'

const PAGE_SIZE = 20

export const GET = withErrorHandler(async (request: Request) => {
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

  // Build filter conditions
  const conditions = [eq(calls.companyId, company.id)]

  // Technicians only see their own calls
  if (role === 'technician') {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    conditions.push(eq(calls.techId, user.id))
  }

  // Optional filters
  const techId = searchParams.get('techId')
  if (techId) conditions.push(eq(calls.techId, techId))

  const jobType = searchParams.get('jobType')
  if (jobType) conditions.push(eq(calls.jobType, jobType as 'drain' | 'plumbing' | 'both'))

  const statusFilter = searchParams.get('status')
  if (statusFilter) conditions.push(eq(calls.status, statusFilter as 'uploading' | 'pending' | 'processing' | 'transcribed' | 'scored' | 'failed'))

  const dateFrom = searchParams.get('dateFrom')
  if (dateFrom) conditions.push(gte(calls.recordedAt, new Date(dateFrom)))

  const dateTo = searchParams.get('dateTo')
  if (dateTo) conditions.push(lte(calls.recordedAt, new Date(dateTo)))

  const whereClause = and(...conditions)!

  const [callsList, countResult] = await Promise.all([
    db
      .select({
        id: calls.id,
        techId: calls.techId,
        techName: users.name,
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
      .leftJoin(users, eq(users.id, calls.techId))
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
})
