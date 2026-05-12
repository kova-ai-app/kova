'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PricebookItem, PricebookItemInput, OpportunityType, JobType, PricingModel } from '@kova/shared'

const OPPORTUNITY_TYPES: Array<{ value: OpportunityType; label: string; trade: JobType }> = [
  { value: 'drain_cleaning_upsell', label: 'Permanent Drain Solution', trade: 'drain' },
  { value: 'hydro_jetting', label: 'Hydro-Jetting', trade: 'drain' },
  { value: 'camera_inspection', label: 'Camera Inspection', trade: 'drain' },
  { value: 'grease_trap', label: 'Grease Trap Service', trade: 'drain' },
  { value: 'preventive_plan', label: 'Preventive Maintenance Plan', trade: 'drain' },
  { value: 'pipe_repair', label: 'Pipe Repair / Liner', trade: 'drain' },
  { value: 'water_heater', label: 'Water Heater Replacement', trade: 'plumbing' },
  { value: 'fixture_upgrade', label: 'Fixture Upgrade', trade: 'plumbing' },
  { value: 'water_filtration', label: 'Water Filtration System', trade: 'plumbing' },
  { value: 'pressure_regulator', label: 'Pressure Regulator', trade: 'plumbing' },
  { value: 'whole_home_repiping', label: 'Whole-Home Repiping', trade: 'plumbing' },
]

interface PricebookFormProps {
  item?: PricebookItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: PricebookItemInput) => void
  isPending: boolean
}

export function PricebookForm({
  item,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: PricebookFormProps) {
  const isEdit = !!item

  const [name, setName] = useState('')
  const [trade, setTrade] = useState<JobType>('drain')
  const [opportunityType, setOpportunityType] = useState<OpportunityType>('drain_cleaning_upsell')
  const [pricingModel, setPricingModel] = useState<PricingModel>('fixed')
  const [priceFixed, setPriceFixed] = useState<string>('')
  const [priceLow, setPriceLow] = useState<string>('')
  const [priceHigh, setPriceHigh] = useState<string>('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [ltvAnnual, setLtvAnnual] = useState<string>('')
  const [ltvYears, setLtvYears] = useState<string>('')

  // Populate form when editing
  useEffect(() => {
    if (item) {
      setName(item.name)
      setTrade(item.trade)
      setOpportunityType(item.opportunityType)
      setPricingModel(item.pricingModel)
      setPriceFixed(item.priceFixed?.toString() ?? '')
      setPriceLow(item.priceLow?.toString() ?? '')
      setPriceHigh(item.priceHigh?.toString() ?? '')
      setIsRecurring(item.isRecurring)
      setLtvAnnual(item.ltvAnnual?.toString() ?? '')
      setLtvYears(item.ltvYears?.toString() ?? '')
    } else {
      setName('')
      setTrade('drain')
      setOpportunityType('drain_cleaning_upsell')
      setPricingModel('fixed')
      setPriceFixed('')
      setPriceLow('')
      setPriceHigh('')
      setIsRecurring(false)
      setLtvAnnual('')
      setLtvYears('')
    }
  }, [item, open])

  const filteredTypes = OPPORTUNITY_TYPES.filter(
    (t) => t.trade === trade
  )

  const handleSubmit = () => {
    const data: PricebookItemInput = {
      name: name.trim(),
      trade,
      opportunityType,
      pricingModel,
      priceFixed: pricingModel === 'fixed' ? (priceFixed !== '' ? Number(priceFixed) : null) : null,
      priceLow: pricingModel === 'range' ? (priceLow !== '' ? Number(priceLow) : null) : null,
      priceHigh: pricingModel === 'range' ? (priceHigh !== '' ? Number(priceHigh) : null) : null,
      isRecurring,
      ltvAnnual: isRecurring ? (ltvAnnual !== '' ? Number(ltvAnnual) : null) : null,
      ltvYears: isRecurring ? (ltvYears !== '' ? Number(ltvYears) : null) : null,
    }
    onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Pricebook Item' : 'Add Pricebook Item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Camera Inspection"
            />
          </div>

          {/* Trade */}
          <div>
            <label className="text-sm font-medium mb-1 block">Trade</label>
            <Select
              value={trade}
              onValueChange={(v) => {
                const t = (v ?? 'drain') as JobType
                setTrade(t)
                const firstType = OPPORTUNITY_TYPES.find((o) => o.trade === t)
                if (firstType) setOpportunityType(firstType.value)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drain">Drain</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Opportunity Type */}
          <div>
            <label className="text-sm font-medium mb-1 block">Opportunity Type</label>
            <Select
              value={opportunityType}
              onValueChange={(v) => setOpportunityType((v ?? opportunityType) as OpportunityType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pricing Model */}
          <div>
            <label className="text-sm font-medium mb-1 block">Pricing Model</label>
            <Select
              value={pricingModel}
              onValueChange={(v) => setPricingModel((v ?? pricingModel) as PricingModel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Price</SelectItem>
                <SelectItem value="range">Price Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price inputs */}
          {pricingModel === 'fixed' ? (
            <div>
              <label className="text-sm font-medium mb-1 block">Price ($)</label>
              <Input
                type="number"
                value={priceFixed}
                onChange={(e) => setPriceFixed(e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Low ($)</label>
                <Input
                  type="number"
                  value={priceLow}
                  onChange={(e) => setPriceLow(e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">High ($)</label>
                <Input
                  type="number"
                  value={priceHigh}
                  onChange={(e) => setPriceHigh(e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>
          )}

          {/* Recurring toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium">
              Recurring service
            </label>
          </div>

          {/* LTV inputs */}
          {isRecurring && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Annual Price ($)</label>
                <Input
                  type="number"
                  value={ltvAnnual}
                  onChange={(e) => setLtvAnnual(e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Years</label>
                <Input
                  type="number"
                  value={ltvYears}
                  onChange={(e) => setLtvYears(e.target.value)}
                  placeholder="5"
                  min={1}
                  max={20}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
          >
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
