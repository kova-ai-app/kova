import { db, calls, scores, opportunities, pricebookItems } from '@kova/db'
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm'
import type { DashboardSummary, OpportunityType } from '@kova/shared'

const TOTAL_OPPORTUNITY_TYPES = 11 // ScoringDimension: 6 drain + 5 plumbing

export async function getDashboardData(companyId: string): Promise<DashboardSummary> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // This week: sum of undisputed triggered opportunities
  const [thisWeek] = await db
    .select({
      totalLow: sql<number>`coalesce(sum(${opportunities.valueLow}), 0)`,
      totalHigh: sql<number>`coalesce(sum(${opportunities.valueHigh}), 0)`,
    })
    .from(opportunities)
    .innerJoin(scores, eq(scores.id, opportunities.scoreId))
    .innerJoin(calls, eq(calls.id, scores.callId))
    .where(
      and(
        eq(calls.companyId, companyId),
        eq(opportunities.triggered, true),
        isNull(opportunities.disputeReason),
        gte(calls.recordedAt, weekAgo)
      )
    )

  // Last week: for change % calculation
  const [lastWeek] = await db
    .select({
      totalHigh: sql<number>`coalesce(sum(${opportunities.valueHigh}), 0)`,
    })
    .from(opportunities)
    .innerJoin(scores, eq(scores.id, opportunities.scoreId))
    .innerJoin(calls, eq(calls.id, scores.callId))
    .where(
      and(
        eq(calls.companyId, companyId),
        eq(opportunities.triggered, true),
        isNull(opportunities.disputeReason),
        gte(calls.recordedAt, twoWeeksAgo),
        sql`${calls.recordedAt} < ${weekAgo}`
      )
    )

  // All-time cumulative total
  const [cumulative] = await db
    .select({
      total: sql<number>`coalesce(sum(${opportunities.valueHigh}), 0)`,
    })
    .from(opportunities)
    .innerJoin(scores, eq(scores.id, opportunities.scoreId))
    .innerJoin(calls, eq(calls.id, scores.callId))
    .where(
      and(
        eq(calls.companyId, companyId),
        eq(opportunities.triggered, true),
        isNull(opportunities.disputeReason)
      )
    )

  // Top 3 opportunity types by dollar value this week
  const topTypes = await db
    .select({
      type: opportunities.type,
      totalValue: sql<number>`coalesce(sum(${opportunities.valueHigh}), 0)`,
    })
    .from(opportunities)
    .innerJoin(scores, eq(scores.id, opportunities.scoreId))
    .innerJoin(calls, eq(calls.id, scores.callId))
    .where(
      and(
        eq(calls.companyId, companyId),
        eq(opportunities.triggered, true),
        isNull(opportunities.disputeReason),
        gte(calls.recordedAt, weekAgo)
      )
    )
    .groupBy(opportunities.type)
    .orderBy(desc(sql`sum(${opportunities.valueHigh})`))
    .limit(3)

  // Pricebook completion: distinct opportunity types with custom pricing / 11
  const [pricebook] = await db
    .select({
      customTypes: sql<number>`count(distinct ${pricebookItems.opportunityType})`,
    })
    .from(pricebookItems)
    .where(
      and(
        eq(pricebookItems.companyId, companyId),
        eq(pricebookItems.active, true),
        eq(pricebookItems.isDefault, false)
      )
    )

  const lastWeekHigh = Number(lastWeek?.totalHigh ?? 0)
  const thisWeekHigh = Number(thisWeek?.totalHigh ?? 0)
  const changePct =
    lastWeekHigh > 0
      ? Math.round(((thisWeekHigh - lastWeekHigh) / lastWeekHigh) * 100)
      : 0

  return {
    opportunityTotalLow: Number(thisWeek?.totalLow ?? 0),
    opportunityTotalHigh: Number(thisWeek?.totalHigh ?? 0),
    opportunityChangePct: changePct,
    cumulativeTotal: Number(cumulative?.total ?? 0),
    topOpportunityTypes: topTypes.map((t) => ({
      type: t.type as OpportunityType,
      totalValue: Number(t.totalValue),
    })),
    pricebookCompletionPct: Math.round(
      (Number(pricebook?.customTypes ?? 0) / TOTAL_OPPORTUNITY_TYPES) * 100
    ),
  }
}
