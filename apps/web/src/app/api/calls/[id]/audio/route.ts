import { NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { db, calls } from '@kova/db'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'
import { getS3Client, S3_BUCKET } from '@/lib/s3'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['owner', 'manager', 'technician'])
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  const [call] = await db
    .select({ s3Key: calls.s3Key })
    .from(calls)
    .where(eq(calls.id, id))

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
}
