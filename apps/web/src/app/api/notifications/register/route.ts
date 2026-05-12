import { NextResponse } from 'next/server'
import { db, users, pushTokens } from '@kova/db'
import { eq, sql } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'

export async function POST(request: Request) {
  const authResult = await requireRole(['owner', 'manager', 'technician'])
  if (authResult instanceof NextResponse) return authResult
  const { clerkUserId } = authResult

  const body = (await request.json()) as { token?: string; platform?: 'ios' | 'android' }

  if (!body.token || !body.platform) {
    return NextResponse.json({ error: 'token and platform are required' }, { status: 400 })
  }

  // Look up DB user by Clerk user ID
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Upsert: if the token already exists, update userId (device may be re-registered)
  await db
    .insert(pushTokens)
    .values({
      userId: user.id,
      token: body.token,
      platform: body.platform,
    })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId: sql`excluded.user_id` },
    })

  return NextResponse.json({ registered: true }, { status: 201 })
}
