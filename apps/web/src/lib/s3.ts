import { S3Client } from '@aws-sdk/client-s3'

// ---------------------------------------------------------------------------
// Singleton S3 client — re-used across invocations in the same warm function
// ---------------------------------------------------------------------------

let s3Client: S3Client | null = null

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}

export const S3_BUCKET = process.env.S3_BUCKET_NAME ?? 'kova-audio-dev'
