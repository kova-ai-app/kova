import { NextResponse } from 'next/server'
import { db, calls, scores, transcripts, opportunities, coachingPoints } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['owner', 'manager', 'technician'])
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  const [call] = await db
    .select()
    .from(calls)
    .where(eq(calls.id, id))

  if (!call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  }

  // Fetch related records in parallel
  const [scoreRows, transcriptRows, opportunityRows, coachingRows] = await Promise.all([
    call.scoreId
      ? db.select().from(scores).where(eq(scores.id, call.scoreId))
      : Promise.resolve([]),
    call.transcriptId
      ? db.select().from(transcripts).where(eq(transcripts.id, call.transcriptId))
      : Promise.resolve([]),
    call.scoreId
      ? db.select().from(opportunities).where(eq(opportunities.scoreId, call.scoreId))
      : Promise.resolve([]),
    db.select().from(coachingPoints).where(eq(coachingPoints.callId, id)),
  ])

  return NextResponse.json({
    call,
    score: scoreRows[0] ?? null,
    transcript: transcriptRows[0] ?? null,
    opportunities: opportunityRows,
    coachingPoints: coachingRows,
  })
}
