import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'

// ---------------------------------------------------------------------------
// Clerk webhook handler
// Events: user.created, user.updated, organization.created,
//         organizationMembership.created
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const payload = await request.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: ReturnType<typeof wh.verify>

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ReturnType<typeof wh.verify>
  } catch (err) {
    console.error('Clerk webhook verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type } = evt as { type: string }
  console.log(`Clerk webhook received: ${type}`)

  // TODO (Week 2): Handle user.created → upsert user in Neon
  // TODO (Week 2): Handle organization.created → upsert company in Neon
  // TODO (Week 2): Handle organizationMembership.created → assign role

  return NextResponse.json({ received: true })
}
