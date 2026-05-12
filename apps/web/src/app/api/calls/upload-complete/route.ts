import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Queue } from 'bullmq'
import { db, calls, companies } from '@kova/db'
import { eq, and } from 'drizzle-orm'
import { QUEUE_NAMES, JOB_NAMES } from '@kova/shared'
import { withErrorHandler } from '@/lib/api-handler'

let scoringQueue: Queue | null = null

function getScoringQueue(): Queue {
  if (!scoringQueue) {
    scoringQueue = new Queue(QUEUE_NAMES.SCORING, {
      connection: { url: process.env.REDIS_URL },
    })
  }
  return scoringQueue
}

export const POST = withErrorHandler(async (request: Request) => {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    callId: string
    sessionId: string
    s3Keys: string[]
    totalDurationSec: number
    chunkCount: number
    jobMetadata: {
      customerName?: string
      jobType?: 'drain' | 'plumbing' | 'both'
      notes?: string
    } | null
    devicePlatform: 'ios' | 'android'
    audioFormat: string
    audioBitrateKbps: number
  }

  if (!body.callId || !body.sessionId || !body.s3Keys?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Update call record — scoped to this company
  await db
    .update(calls)
    .set({
      s3Key: body.s3Keys[0],
      durationSec: Math.round(body.totalDurationSec),
      status: 'pending',
      customerName: body.jobMetadata?.customerName ?? null,
      jobType: body.jobMetadata?.jobType ?? null,
      notes: body.jobMetadata?.notes ?? null,
    })
    .where(and(eq(calls.id, body.callId), eq(calls.companyId, company.id)))

  // Enqueue scoring job
  await getScoringQueue().add(
    JOB_NAMES.SCORE_CALL,
    {
      callId: body.callId,
      s3Keys: body.s3Keys,
      totalDurationSec: body.totalDurationSec,
      jobType: body.jobMetadata?.jobType,
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  )

  return NextResponse.json({ callId: body.callId, status: 'pending' }, { status: 202 })
})
