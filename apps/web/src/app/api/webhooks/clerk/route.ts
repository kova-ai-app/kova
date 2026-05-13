import { type NextRequest, NextResponse } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import type { WebhookEvent } from '@clerk/nextjs/webhooks'
import { db, companies, users } from '@kova/db'
import type { UserRole } from '@kova/shared'

function clerkRoleToKovaRole(clerkRole: string): UserRole {
  if (clerkRole === 'org:admin') return 'owner'
  if (clerkRole === 'org:manager') return 'manager'
  return 'technician'
}

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SECRET) {
    console.error('[webhook] CLERK_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let evt: WebhookEvent
  try {
    evt = await verifyWebhook(request, {
      signingSecret: process.env.CLERK_WEBHOOK_SECRET,
    })
  } catch (err) {
    console.error('[webhook] verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (evt.type) {
      case 'user.created': {
        console.log(`[webhook] user.created: ${evt.data.id} — awaiting org membership`)
        break
      }

      case 'organization.created': {
        const org = evt.data
        await db.insert(companies)
          .values({ clerkOrgId: org.id, name: org.name, plan: 'pilot', state: 'CA' })
          .onConflictDoUpdate({
            target: companies.clerkOrgId,
            set: { name: org.name },
          })
        console.log(`[webhook] organization.created: ${org.id} (${org.name})`)
        break
      }

      case 'organizationMembership.created': {
        const membership = evt.data
        const clerkUserId = membership.public_user_data.user_id
        const clerkOrgId = membership.organization.id
        const firstName = membership.public_user_data.first_name ?? ''
        const lastName = membership.public_user_data.last_name ?? ''
        const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown'
        const role = clerkRoleToKovaRole(membership.role)

        const company = await db.query.companies.findFirst({
          where: (c, { eq }) => eq(c.clerkOrgId, clerkOrgId),
        })

        if (!company) {
          console.warn(`[webhook] company not found for org ${clerkOrgId} — skipping user upsert`)
          return NextResponse.json(
            { error: 'company not found — retry later' },
            { status: 500 }
          )
        }

        await db.insert(users)
          .values({ companyId: company.id, clerkUserId, role, name, languagePref: 'en' })
          .onConflictDoUpdate({
            target: users.clerkUserId,
            set: { companyId: company.id, role, name },
          })
        console.log(`[webhook] organizationMembership.created: ${clerkUserId} → ${role}`)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
