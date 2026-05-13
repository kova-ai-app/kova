import { NextResponse } from 'next/server'
import { db, opportunities, scores, calls, users } from '@kova/db'
import { eq, and } from 'drizzle-orm'
import { getAuthWithCompany } from '@/lib/auth'
import { withErrorHandler } from '@/lib/api-handler'
import { SoldRequestSchema } from '@kova/shared'

export const PATCH = withErrorHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { auth, error } = await getAuthWithCompany(['owner', 'manager', 'technician', 'sales'])
  if (error) return error

  const { id: opportunityId } = await params
  const body = SoldRequestSchema.parse(await request.json())

  // Verify opportunity belongs to this company (opportunities → scores → calls)
  const [opp] = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .innerJoin(scores, eq(opportunities.scoreId, scores.id))
    .innerJoin(calls, eq(scores.callId, calls.id))
    .where(and(eq(opportunities.id, opportunityId), eq(calls.companyId, auth.companyId)))

  if (!opp) {
    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  }

  // Resolve the DB user ID from the Clerk user ID
  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, auth.clerkUserId))

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const [updated] = await db
    .update(opportunities)
    .set({
      soldAmount: body.soldAmount,
      soldPricebookItemId: body.soldPricebookItemId,
      soldAt: new Date(),
      soldByUserId: dbUser.id,
    })
    .where(eq(opportunities.id, opportunityId))
    .returning()

  return NextResponse.json(updated)
})
