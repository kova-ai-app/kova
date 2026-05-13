import { NextResponse } from 'next/server'
import { db, feedback, calls } from '@kova/db'
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

  // Verify feedback point belongs to this company (via calls join)
  const [point] = await db
    .select({ id: feedback.id })
    .from(feedback)
    .innerJoin(calls, eq(feedback.callId, calls.id))
    .where(and(eq(feedback.id, id), eq(calls.companyId, auth.companyId)))

  if (!point) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db
    .update(feedback)
    .set({
      reviewedAt: new Date(),
      ...(body.managerNote ? { managerNote: body.managerNote.trim() } : {}),
    })
    .where(eq(feedback.id, id))

  return new NextResponse(null, { status: 204 })
})
