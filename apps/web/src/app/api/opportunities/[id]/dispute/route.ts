import { NextResponse } from 'next/server'
import { db, opportunities } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only owners and managers may dispute opportunities
  const authResult = await requireRole(['owner', 'manager'])
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const body = (await request.json()) as { reason?: string }

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  }

  await db
    .update(opportunities)
    .set({
      disputeReason: body.reason.trim(),
      disputedAt: new Date(),
    })
    .where(eq(opportunities.id, id))

  return NextResponse.json({ disputed: true })
}
