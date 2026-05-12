'use client'

import { useState } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PricebookForm } from '@/components/pricebook-form'
import { formatMoney, formatMoneyRange } from '@/lib/utils'
import type { PricebookItem, PricebookItemInput } from '@kova/shared'

const TOTAL_OPPORTUNITY_TYPES = 11

export default function PricebookPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<PricebookItem | null>(null)

  const { data: items, isLoading } = useQuery<PricebookItem[]>({
    queryKey: ['pricebook'],
    queryFn: () => fetch('/api/pricebook').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: PricebookItemInput) =>
      fetch('/api/pricebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook'] })
      setFormOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PricebookItemInput> }) =>
      fetch(`/api/pricebook/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook'] })
      setEditItem(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/pricebook/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook'] })
    },
  })

  const activeItems = items?.filter((i) => i.active) ?? []
  const completionPct = Math.round(
    (new Set(activeItems.filter((i) => !i.isDefault).map((i) => i.opportunityType)).size /
      TOTAL_OPPORTUNITY_TYPES) *
      100
  )

  const formatPrice = (item: PricebookItem) => {
    if (item.pricingModel === 'fixed') {
      return formatMoney(item.priceFixed ?? 0)
    }
    return formatMoneyRange(item.priceLow ?? 0, item.priceHigh ?? 0)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pricebook</h1>
        <Button onClick={() => { setEditItem(null); setFormOpen(true) }}>
          Add Item
        </Button>
      </div>

      {/* Completion indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Pricebook Completion</span>
            <span className="text-sm text-muted-foreground">{completionPct}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(completionPct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {new Set(activeItems.filter((i) => !i.isDefault).map((i) => i.opportunityType)).size} of {TOTAL_OPPORTUNITY_TYPES} opportunity types have custom pricing.
            {completionPct < 100 && ' Items with default pricing use industry averages.'}
          </p>
        </CardContent>
      </Card>

      {completionPct < 70 && (
        <Alert>
          <AlertDescription>
            Custom pricing improves opportunity accuracy. Configure at least 70% of
            your pricebook for the best results.
          </AlertDescription>
        </Alert>
      )}

      {/* Pricebook table */}
      {activeItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No pricebook items yet. Add your first item to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Trade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-accent/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    {item.name}
                    {item.isDefault && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        default
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize">
                      {item.trade}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                    {item.opportunityType.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                    {item.pricingModel}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums">
                    {formatPrice(item)}
                    {item.isRecurring && item.ltvAnnual && item.ltvYears && (
                      <span className="text-xs text-muted-foreground block">
                        LTV: {formatMoney(item.ltvAnnual * item.ltvYears)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.isRecurring ? (
                      <Badge variant="secondary">Recurring</Badge>
                    ) : (
                      <Badge variant="outline">One-time</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditItem(item)
                          setFormOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Deactivate this item? It can be re-added later.')) {
                            deleteMutation.mutate(item.id)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit form dialog */}
      <PricebookForm
        item={editItem}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditItem(null)
        }}
        onSubmit={(data) => {
          if (editItem) {
            updateMutation.mutate({ id: editItem.id, data })
          } else {
            createMutation.mutate(data)
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}
