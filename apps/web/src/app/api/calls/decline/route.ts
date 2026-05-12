import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, auditLogs, companies, users } from '@kova/db'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    sessionId: string
    declinedAt: string
    reason: string
  }

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))

  await db.insert(auditLogs).values({
    companyId: company?.id ?? 'unknown',
    userId: user?.id,
    action: 'recording_declined',
    targetType: 'session',
  })

  return new NextResponse(null, { status: 204 })
}
