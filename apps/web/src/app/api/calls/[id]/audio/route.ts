import { NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { db, calls } from '@kova/db'
import { eq, and } from 'drizzle-orm'
import { getAuthWithCompany } from '@/lib/auth'
import { withErrorHandler } from '@/lib/api-handler'
import { getS3Client, S3_BUCKET } from '@/lib/s3'

export const GET = withErrorHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { auth, error } = await getAuthWithCompany(['owner', 'manager', 'technician'])
  if (error) return error

  const { id } = await params

  const [call] = await db
    .select({ s3Key: calls.s3Key })
    .from(calls)
    .where(and(eq(calls.id, id), eq(calls.companyId, auth.companyId)))

  if (!call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  }

  if (!call.s3Key) {
    return NextResponse.json({ error: 'Audio not available' }, { status: 404 })
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: call.s3Key,
  })

  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 })

  return NextResponse.json({ url, expiresInSec: 3600 })
})
