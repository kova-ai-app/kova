import { NextResponse } from 'next/server'
import { db, coachingPoints, calls } from '@kova/db'
import { eq, and } from 'drizzle-orm'
import { getAuthWithCompany } from '@/lib/auth'
import { withErrorHandler } from '@/lib/api-handler'

export const PATCH = withErrorHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { auth, error } = await getAuthWithCompany(['owner', 'manager', 'technician'])
  if (error) return error

  const { id } = await params
  const body = (await request.json()) as { managerNote?: string }

  // Verify coaching point belongs to this company (via calls join)
  const [point] = await db
    .select({ id: coachingPoints.id })
    .from(coachingPoints)
    .innerJoin(calls, eq(coachingPoints.callId, calls.id))
    .where(and(eq(coachingPoints.id, id), eq(calls.companyId, auth.companyId)))

  if (!point) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .update(coachingPoints)
    .set({
      reviewedAt: new Date(),
      ...(body.managerNote ? { managerNote: body.managerNote.trim() } : {}),
    })
    .where(eq(coachingPoints.id, id))

  return new NextResponse(null, { status: 204 })
})
