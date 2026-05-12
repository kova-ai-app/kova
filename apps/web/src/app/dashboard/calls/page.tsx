'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatMoneyRange,
  formatDuration,
  formatRelativeTime,
} from '@/lib/utils'
import type { CallSummary, PaginatedResponse } from '@kova/shared'

export default function CallLibraryPage() {
  const [page, setPage] = useState(0)
  const [techId, setTechId] = useState('')
  const [jobType, setJobType] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const params = new URLSearchParams()
  params.set('page', String(page))
  if (techId) params.set('techId', techId)
  if (jobType) params.set('jobType', jobType)
  if (status) params.set('status', status)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)

  const { data, isLoading } = useQuery<PaginatedResponse<CallSummary>>({
    queryKey: ['calls', page, techId, jobType, status, dateFrom, dateTo],
    queryFn: () => fetch(`/api/calls?${params}`).then((r) => r.json()),
  })

  const { data: techs } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['techs'],
    queryFn: () => fetch('/api/techs').then((r) => r.json()),
  })

  const resetFilters = () => {
    setTechId('')
    setJobType('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Call Library</h1>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select
              value={techId || 'all'}
              onValueChange={(v) => {
                setTechId(v === 'all' || v == null ? '' : v)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {techs?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={jobType || 'all'}
              onValueChange={(v) => {
                setJobType(v === 'all' || v == null ? '' : v)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="drain">Drain</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={status || 'all'}
              onValueChange={(v) => {
                setStatus(v === 'all' || v == null ? '' : v)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scored">Scored</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(0)
              }}
              className="w-[160px]"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(0)
              }}
              className="w-[160px]"
            />

            <Button variant="ghost" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No calls match your filters.{' '}
              <button
                onClick={resetFilters}
                className="underline font-medium"
              >
                Reset filters
              </button>
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tech
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Opportunity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.data.map((call) => (
                  <tr
                    key={call.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/calls/${call.id}`}
                        className="font-medium hover:underline text-sm"
                      >
                        {call.techName}
                      </Link>
                      {call.customerName && (
                        <span className="text-xs text-muted-foreground block">
                          {call.customerName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatRelativeTime(call.recordedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {call.jobType && (
                        <Badge variant="outline" className="capitalize">
                          {call.jobType}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                      {formatDuration(call.durationSec)}
                    </td>
                    <td className="px-4 py-3">
                      {call.overallScore != null ? (
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
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums">
                      {call.opportunityTotalHigh != null &&
                      call.opportunityTotalHigh > 0
                        ? formatMoneyRange(
                            call.opportunityTotalLow ?? 0,
                            call.opportunityTotalHigh
                          )
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data?.total ?? 0} total calls
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={data?.nextPage === null}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
