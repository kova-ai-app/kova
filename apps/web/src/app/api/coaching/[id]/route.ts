import { NextResponse } from 'next/server'
import { db, coachingPoints } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['owner', 'manager', 'technician'])
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const body = (await request.json()) as { managerNote?: string }

  await db
    .update(coachingPoints)
    .set({
      reviewedAt: new Date(),
      ...(body.managerNote ? { managerNote: body.managerNote.trim() } : {}),
    })
    .where(eq(coachingPoints.id, id))

  return new NextResponse(null, { status: 204 })
}
