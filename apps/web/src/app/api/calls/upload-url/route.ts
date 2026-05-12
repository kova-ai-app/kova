import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { db, companies } from '@kova/db'
import { eq } from 'drizzle-orm'
import { getS3Client, S3_BUCKET } from '@/lib/s3'

const PRESIGNED_URL_EXPIRES_SEC = 900 // 15 minutes

export async function GET(request: Request) {
  // Auth
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Params
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const chunkIndex = searchParams.get('chunkIndex')
  const contentType = searchParams.get('contentType') ?? 'audio/aac'

  if (!sessionId || chunkIndex === null) {
    return NextResponse.json(
      { error: 'sessionId and chunkIndex are required' },
      { status: 400 }
    )
  }

  // Resolve companyId from Clerk org — prevents cross-tenant writes
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, orgId))

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const s3Key = `audio/${company.id}/${sessionId}/chunk_${chunkIndex}.aac`

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    ContentType: contentType,
  })

  const presignedUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGNED_URL_EXPIRES_SEC,
  })

  return NextResponse.json({ presignedUrl, s3Key, expiresIn: PRESIGNED_URL_EXPIRES_SEC })
}
