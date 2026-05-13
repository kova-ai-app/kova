import { NextResponse } from 'next/server'
import { db, customers } from '@kova/db'
import { desc, eq } from 'drizzle-orm'
import { getAuthWithCompany } from '@/lib/auth'
import { withErrorHandler } from '@/lib/api-handler'
import { CustomerInputSchema } from '@kova/shared'

const ALL_ROLES = ['owner', 'manager', 'technician', 'sales'] as const

export const GET = withErrorHandler(async (_request: Request) => {
  const { auth, error } = await getAuthWithCompany([...ALL_ROLES])
  if (error) return error

  const list = await db
    .select()
    .from(customers)
    .where(eq(customers.companyId, auth.companyId))
    .orderBy(desc(customers.createdAt))

  return NextResponse.json(list)
})

export const POST = withErrorHandler(async (request: Request) => {
  const { auth, error } = await getAuthWithCompany([...ALL_ROLES])
  if (error) return error

  const body = await request.json()
  const parsed = CustomerInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const [customer] = await db
    .insert(customers)
    .values({
      companyId: auth.companyId,
      ...parsed.data,
    })
    .returning()

  return NextResponse.json(customer, { status: 201 })
})
