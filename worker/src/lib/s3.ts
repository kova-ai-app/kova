import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION ?? 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

async function downloadObject(bucket: string, key: string): Promise<Buffer> {
  const res = await getS3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  if (!res.Body) throw new Error('S3 object has no body')
  const parts: Uint8Array[] = []
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    parts.push(chunk)
  }
  return Buffer.concat(parts)
}

/**
 * Download all S3 chunks for a call and return them concatenated in order.
 * AAC-LC ADTS files can be safely byte-concatenated.
 */
export async function downloadChunks(s3Keys: string[]): Promise<Buffer> {
  const bucket = process.env.S3_BUCKET_NAME!
  const buffers = await Promise.all(s3Keys.map((key) => downloadObject(bucket, key)))
  return Buffer.concat(buffers)
}
