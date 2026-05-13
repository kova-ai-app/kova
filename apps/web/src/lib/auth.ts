import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@kova/shared'
import { db } from '@kova/db'

// ---------------------------------------------------------------------------
// Maps Clerk organization role slugs to Kova roles
// Clerk roles: org:admin (owner), org:manager (custom), org:member (tech)
// ---------------------------------------------------------------------------
const CLERK_ROLE_MAP: Record<string, UserRole> = {
  'org:admin': 'owner',
  'org:manager': 'manager',
  'org:member': 'technician',
  'org:sales': 'sales' as const,
}

export interface AuthContext {
  clerkUserId: string   // e.g. "user_2abc..."
  orgId: string         // e.g. "org_2xyz..."
  role: UserRole        // mapped Kova role
}

/**
 * Extract and map auth context from the current Clerk session.
 * Throws if the user is not authenticated or not in an organization.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const { userId, orgId, orgRole } = await auth()

  if (!userId || !orgId || !orgRole) {
    throw new Error('Unauthorized: no active session or organization')
  }

  const role = CLERK_ROLE_MAP[orgRole] ?? 'technician'

  return { clerkUserId: userId, orgId, role }
}

/**
 * Guard an API route to require specific Kova role(s).
 * Returns AuthContext if authorized, or a NextResponse error if not.
 *
 * Usage:
 *   const result = await requireRole(['owner', 'manager'])
 *   if (result instanceof NextResponse) return result
 *   const { clerkUserId, orgId, role } = result
 */
export async function requireRole(
  allowedRoles: UserRole[],
): Promise<AuthContext | NextResponse> {
  try {
    const ctx = await getAuthContext()
    if (!allowedRoles.includes(ctx.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return ctx
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export interface AuthWithCompany extends AuthContext {
  companyId: string
}

type AuthWithCompanyResult =
  | { auth: AuthWithCompany; error: null }
  | { auth: null; error: NextResponse }

/**
 * Like requireRole(), but also resolves the company from orgId.
 * Use in routes that need to scope queries to the authenticated company.
 */
export async function getAuthWithCompany(
  allowedRoles: UserRole[]
): Promise<AuthWithCompanyResult> {
  const result = await requireRole(allowedRoles)
  if (result instanceof NextResponse) {
    return { auth: null, error: result }
  }

  const company = await db.query.companies.findFirst({
    where: (c, { eq }) => eq(c.clerkOrgId, result.orgId),
  })

  if (!company) {
    return {
      auth: null,
      error: NextResponse.json({ error: 'Company not found' }, { status: 404 }),
    }
  }

  return { auth: { ...result, companyId: company.id }, error: null }
}
