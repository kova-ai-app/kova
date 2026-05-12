import { NextResponse } from 'next/server'
import { db, opportunities, scores, calls } from '@kova/db'
import { eq, and } from 'drizzle-orm'
import { getAuthWithCompany } from '@/lib/auth'
import { withErrorHandler } from '@/lib/api-handler'

export const POST = withErrorHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Only owners and managers may dispute opportunities
  const { auth, error } = await getAuthWithCompany(['owner', 'manager'])
  if (error) return error

  const { id } = await params
  const body = (await request.json()) as { reason?: string }

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  }

  // Verify opportunity belongs to this company (opportunities → scores → calls)
  const [opp] = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .innerJoin(scores, eq(opportunities.scoreId, scores.id))
    .innerJoin(calls, eq(scores.callId, calls.id))
    .where(and(eq(opportunities.id, id), eq(calls.companyId, auth.companyId)))

  if (!opp) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .update(opportunities)
    .set({
      disputeReason: body.reason.trim(),
      disputedAt: new Date(),
    })
    .where(eq(opportunities.id, id))

  return NextResponse.json({ disputed: true })
})
