import { NextResponse } from 'next/server'
import { db, calls, coachingPoints } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['owner', 'manager'])
  if (authResult instanceof NextResponse) return authResult

  const { id: callId } = await params
  const body = (await request.json()) as { text?: string }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // Get the call to find techId
  const [call] = await db
    .select({ techId: calls.techId })
    .from(calls)
    .where(eq(calls.id, callId))

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
}
