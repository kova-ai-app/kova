import { NextResponse } from 'next/server'
import { db, calls, coachingPoints } from '@kova/db'
import { eq, and } from 'drizzle-orm'
import { getAuthWithCompany } from '@/lib/auth'
import { withErrorHandler } from '@/lib/api-handler'

export const POST = withErrorHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { auth, error } = await getAuthWithCompany(['owner', 'manager'])
  if (error) return error

  const { id: callId } = await params
  const body = (await request.json()) as { text?: string }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // Get the call — verify it belongs to this company
  const [call] = await db
    .select({ id: calls.id, techId: calls.techId })
    .from(calls)
    .where(and(eq(calls.id, callId), eq(calls.companyId, auth.companyId)))

  if (!call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  }

  const [point] = await db
    .insert(coachingPoints)
    .values({
      callId,
      techId: call.techId,
      text: body.text.trim(),
    })
    .returning({ id: coachingPoints.id, createdAt: coachingPoints.createdAt })

  return NextResponse.json(point, { status: 201 })
})
