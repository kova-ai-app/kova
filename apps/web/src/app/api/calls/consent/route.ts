import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, calls, companies, users } from '@kova/db'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    sessionId: string
    callId: string
    consentedAt: string
    devicePlatform: 'ios' | 'android'
  }

  if (!body.sessionId || !body.callId || !body.consentedAt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Resolve company and user from JWT — never trust client-provided IDs
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, userId))
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const consentLoggedAt = new Date(body.consentedAt)

  // Upsert call record — safe to retry
  const [call] = await db
    .insert(calls)
    .values({
      id: body.callId,
      sessionId: body.sessionId,
      companyId: company.id,
      techId: user.id,
      recordedAt: consentLoggedAt,
      consentLoggedAt,
      status: 'uploading',
      language: 'unknown',
    })
    .onConflictDoUpdate({
      target: calls.sessionId,
      set: { consentLoggedAt, status: 'uploading' },
    })
    .returning({ id: calls.id, consentLoggedAt: calls.consentLoggedAt })

  return NextResponse.json({
    callId: call!.id,
    consentLoggedAt: call!.consentLoggedAt,
  })
}
