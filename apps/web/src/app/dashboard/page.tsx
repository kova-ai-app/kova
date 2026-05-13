import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard'
import { db, companies, calls, scores, users, customers } from '@kova/db'
import { eq, desc } from 'drizzle-orm'
import { formatMoney, formatMoneyRange, formatRelativeTime } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  // User is authenticated but has no active Clerk organization yet.
  // Redirect to sign-in would cause an infinite loop — show onboarding instead.
  if (!orgId) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Welcome to Kova</h1>
        <Alert>
          <AlertDescription>
            Your account isn&apos;t linked to a company yet. Please ask your
            administrator to invite you to your company&apos;s organization, or{' '}
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              create an organization in Clerk
            </a>{' '}
            if you&apos;re setting up a new account.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  let ctx
  try {
    ctx = await getAuthContext()
  } catch {
    redirect('/sign-in')
  }

  // Resolve company
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.clerkOrgId, ctx.orgId))

  if (!company) {
    return (
      <div className="max-w-2xl">
        <Alert>
          <AlertDescription>
            No organization found. Please join or create an organization in Clerk.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Cached dashboard summary (5 min TTL)
  const getCachedDashboard = unstable_cache(
    () => getDashboardData(company.id),
    [`dashboard-${company.id}`],
    { revalidate: 300 }
  )
  const summary = await getCachedDashboard()

  // Recent calls (last 10)
  const recentCalls = await db
    .select({
      id: calls.id,
      techId: calls.techId,
      techName: users.name,
      recordedAt: calls.recordedAt,
      durationSec: calls.durationSec,
      status: calls.status,
      jobType: calls.jobType,
      customerName: customers.name,
      overallScore: scores.overallScore,
      opportunityTotalLow: scores.opportunityTotalLow,
      opportunityTotalHigh: scores.opportunityTotalHigh,
    })
    .from(calls)
    .leftJoin(scores, eq(scores.id, calls.scoreId))
    .leftJoin(users, eq(users.id, calls.techId))
    .leftJoin(customers, eq(customers.id, calls.customerId))
    .where(eq(calls.companyId, company.id))
    .orderBy(desc(calls.recordedAt))
    .limit(10)

  // Empty state
  if (recentCalls.length === 0) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No calls recorded yet. Ask your team to record their first call
              — results appear here within 5 minutes.
            </p>
            <Link
              href="/dashboard/settings"
              className="text-brand-600 font-medium mt-4 inline-block"
            >
              Add Team Members →
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const trendArrow = summary.opportunityChangePct >= 0 ? '↑' : '↓'
  const trendColor =
    summary.opportunityChangePct >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {/* Pricebook completion banner */}
      {summary.pricebookCompletionPct < 70 && (
        <Alert>
          <AlertDescription>
            Your pricebook is {summary.pricebookCompletionPct}% configured.
            Custom pricing improves opportunity accuracy.{' '}
            <Link
              href="/dashboard/pricebook"
              className="font-medium underline"
            >
              Configure Pricebook →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Hero number */}
      <Card className="border-l-4 border-l-brand-500">
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Weekly Opportunity Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-semibold tracking-tight">
            {formatMoneyRange(
              summary.opportunityTotalLow,
              summary.opportunityTotalHigh
            )}
          </p>
          <p className="text-sm mt-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              summary.opportunityChangePct >= 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {trendArrow} {Math.abs(summary.opportunityChangePct)}%
            </span>
            <span className="text-muted-foreground">vs last week</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Since you started: {formatMoney(summary.cumulativeTotal)} identified
          </p>
        </CardContent>
      </Card>

      {/* Top 3 opportunity types */}
      {summary.topOpportunityTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Top Opportunity Types This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.topOpportunityTypes.map((opp, i) => (
                <div
                  key={opp.type}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {i + 1}.
                    </span>
                    <span className="text-sm capitalize">
                      {opp.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatMoney(opp.totalValue)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent calls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recent Calls
          </CardTitle>
          <Link
            href="/dashboard/calls"
            className="text-sm text-brand-600 font-medium"
          >
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentCalls.map((call) => (
              <Link
                key={call.id}
                href={`/dashboard/calls/${call.id}`}
                className="flex items-center justify-between py-2.5 hover:bg-accent rounded-lg px-2 -mx-2 transition-colors"
              >
                <div>
                  <span className="text-sm font-semibold">
                    {call.techName ?? 'Unknown'}
                  </span>
                  {call.customerName && (
                    <span className="text-xs text-muted-foreground ml-2">
                      · {call.customerName}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-2">
                    · {formatRelativeTime(call.recordedAt as unknown as string)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {call.overallScore != null && (
                    <Badge
                      variant={
                        call.overallScore >= 70
                          ? 'default'
                          : call.overallScore >= 40
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {call.overallScore}%
                    </Badge>
                  )}
                  {call.opportunityTotalHigh != null &&
                    call.opportunityTotalHigh > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {formatMoneyRange(
                          call.opportunityTotalLow ?? 0,
                          call.opportunityTotalHigh
                        )}
                      </span>
                    )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footnote */}
      <p className="text-xs text-muted-foreground">
        Estimated based on your pricebook. Disputed items excluded.
      </p>
    </div>
  )
}
