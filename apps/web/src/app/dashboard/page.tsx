import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

// ---------------------------------------------------------------------------
// Dashboard — shows real user/org context from Clerk session
// Full dashboard UI is Week 8; this confirms auth is wired correctly.
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const name = user?.firstName ?? 'there'

  const roleLabel =
    orgRole === 'org:admin'
      ? 'Owner'
      : orgRole === 'org:manager'
        ? 'Manager'
        : 'Technician'

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Welcome back, {name}</h1>
      <p className="text-gray-500 mb-6">
        Role: <span className="font-medium text-gray-700">{roleLabel}</span>
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        Full dashboard coming in Week 8. Auth is wired — you are signed in.
      </div>

      {!orgId && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          No organization selected. Please join or create an organization in Clerk.
        </div>
      )}
    </div>
  )
}
