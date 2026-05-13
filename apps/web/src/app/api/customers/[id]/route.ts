import { NextResponse } from 'next/server'
import { db, customers } from '@kova/db'
import { eq, and } from 'drizzle-orm'
import { getAuthWithCompany } from '@/lib/auth'
import { withErrorHandler } from '@/lib/api-handler'
import { CustomerInputSchema } from '@kova/shared'

const ALL_ROLES = ['owner', 'manager', 'technician', 'sales'] as const

export const GET = withErrorHandler(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { auth, error } = await getAuthWithCompany([...ALL_ROLES])
  if (error) return error

  const { id } = await params

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.companyId, auth.companyId)))

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  return NextResponse.json(customer)
})

export const PATCH = withErrorHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { auth, error } = await getAuthWithCompany([...ALL_ROLES])
  if (error) return error

  const { id } = await params

  // Verify customer belongs to this company
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.companyId, auth.companyId)))

  if (!existing) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = CustomerInputSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const [updated] = await db
    .update(customers)
    .set(parsed.data)
    .where(eq(customers.id, id))
    .returning()

  return NextResponse.json(updated)
})
