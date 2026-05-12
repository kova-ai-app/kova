'use client'

import { useState } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AudioPlayer } from '@/components/audio-player'
import { TranscriptViewer } from '@/components/transcript-viewer'
import { formatMoneyRange, formatDuration } from '@/lib/utils'
import type {
  Call,
  Score,
  Opportunity,
  CoachingPoint,
  Transcript,
  DimensionScore,
} from '@kova/shared'

interface CallDetailResponse {
  call: Call & { customerName?: string; jobType?: string }
  score: Score | null
  transcript: Transcript | null
  opportunities: Opportunity[]
  coachingPoints: CoachingPoint[]
}

const DISPUTE_REASONS = [
  { value: 'existing_service', label: 'Already has this service' },
  { value: 'offered_declined', label: 'Offered but declined' },
  { value: 'not_relevant', label: 'Not relevant to this job' },
  { value: 'affordability', label: 'Customer cannot afford' },
  { value: 'other', label: 'Other' },
]

export default function CallDetailPage() {
  const { callId } = useParams<{ callId: string }>()
  const queryClient = useQueryClient()
  const [audioTime, setAudioTime] = useState(0)
  const [seekTo, setSeekTo] = useState<number | null>(null)
  const [coachingText, setCoachingText] = useState('')
  const [disputeOppId, setDisputeOppId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')

  const { data, isLoading } = useQuery<CallDetailResponse>({
    queryKey: ['call', callId],
    queryFn: () => fetch(`/api/calls/${callId}`).then((r) => r.json()),
  })

  const { data: audioData } = useQuery<{ url: string; expiresInSec: number }>({
    queryKey: ['callAudio', callId],
    queryFn: () => fetch(`/api/calls/${callId}/audio`).then((r) => r.json()),
    enabled: !!data?.call?.s3Key,
  })

  const disputeMutation = useMutation({
    mutationFn: ({ oppId, reason }: { oppId: string; reason: string }) =>
      fetch(`/api/opportunities/${oppId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call', callId] })
      setDisputeOppId(null)
      setDisputeReason('')
    },
  })

  const coachingMutation = useMutation({
    mutationFn: (text: string) =>
      fetch(`/api/calls/${callId}/coaching`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call', callId] })
      setCoachingText('')
    },
  })

  const reviewMutation = useMutation({
    mutationFn: (pointId: string) =>
      fetch(`/api/coaching/${pointId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call', callId] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-muted-foreground">Call not found.</p>
  }

  const { call, score, transcript, opportunities, coachingPoints } = data

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link + header */}
      <div>
        <Link
          href="/dashboard/calls"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3 w-3" /> Back to calls
        </Link>
        <h1 className="text-2xl font-bold">Call Detail</h1>
        <p className="text-sm text-muted-foreground">
          {call.customerName ?? 'Unknown customer'} ·{' '}
          {formatDuration(call.durationSec)} ·{' '}
          {new Date(call.recordedAt).toLocaleDateString()}
          {call.jobType && (
            <>
              {' · '}
              <Badge variant="outline" className="capitalize">
                {call.jobType}
              </Badge>
            </>
          )}
        </p>
      </div>

      {/* Audio Player */}
      {audioData?.url && (
        <AudioPlayer
          src={audioData.url}
          onTimeUpdate={setAudioTime}
          seekTo={seekTo}
          onSeeked={() => setSeekTo(null)}
        />
      )}

      {/* Transcript */}
      {transcript && (
        <TranscriptViewer
          segments={transcript.segments}
          currentTime={audioTime}
          onSegmentClick={(startSec) => setSeekTo(startSec)}
        />
      )}

      {/* Overall Score */}
      {score && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Overall Score
              <Badge
                variant={
                  score.overallScore >= 70
                    ? 'default'
                    : score.overallScore >= 40
                      ? 'secondary'
                      : 'destructive'
                }
                className="text-lg"
              >
                {score.overallScore}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(score.dimensions as DimensionScore[]).map((dim) => (
                <div
                  key={dim.dimension}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <span className="text-sm capitalize">
                    {dim.dimension.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        dim.score >= 70
                          ? 'default'
                          : dim.score >= 40
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {dim.score}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Opportunities
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {formatMoneyRange(
                  score?.opportunityTotalLow ?? 0,
                  score?.opportunityTotalHigh ?? 0
                )}{' '}
                total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {opportunities.map((opp) => (
                <div key={opp.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium capitalize">
                        {opp.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {formatMoneyRange(opp.valueLow, opp.valueHigh)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {opp.triggered && !opp.offered && !opp.disputeReason && (
                        <Badge variant="destructive">Missed</Badge>
                      )}
                      {opp.triggered && opp.offered && (
                        <Badge>Offered</Badge>
                      )}
                      {opp.disputeReason && (
                        <Badge variant="outline">Disputed</Badge>
                      )}
                    </div>
                  </div>

                  {opp.clipStartSec != null && (
                    <button
                      onClick={() => setSeekTo(opp.clipStartSec!)}
                      className="text-xs text-brand-600 mt-1 hover:underline"
                    >
                      Jump to {formatDuration(Math.round(opp.clipStartSec))}
                    </button>
                  )}

                  {/* Dispute dialog */}
                  {!opp.disputeReason && (
                    <Dialog
                      open={disputeOppId === opp.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setDisputeOppId(null)
                          setDisputeReason('')
                        }
                      }}
                    >
                      <DialogTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => setDisputeOppId(opp.id)}
                        >
                          Dispute
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Dispute Opportunity</DialogTitle>
                        </DialogHeader>
                        <Select
                          value={disputeReason}
                          onValueChange={(v) => setDisputeReason(v ?? '')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {DISPUTE_REASONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() =>
                            disputeMutation.mutate({
                              oppId: opp.id,
                              reason: disputeReason,
                            })
                          }
                          disabled={
                            !disputeReason || disputeMutation.isPending
                          }
                        >
                          {disputeMutation.isPending
                            ? 'Submitting...'
                            : 'Submit Dispute'}
                        </Button>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coaching Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Coaching Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {coachingPoints.length > 0 && (
            <div className="space-y-3 mb-4">
              {coachingPoints.map((point) => (
                <div key={point.id} className="border rounded-lg p-3">
                  <p className="text-sm">{point.text}</p>
                  {point.managerNote && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: {point.managerNote}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {point.reviewedAt ? (
                      <Badge variant="outline">Reviewed</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reviewMutation.mutate(point.id)}
                        disabled={reviewMutation.isPending}
                      >
                        Mark as Reviewed
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Separator className="my-4" />
          <div className="flex gap-2">
            <Input
              value={coachingText}
              onChange={(e) => setCoachingText(e.target.value)}
              placeholder="Add a coaching note..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && coachingText.trim()) {
                  coachingMutation.mutate(coachingText)
                }
              }}
            />
            <Button
              onClick={() => coachingMutation.mutate(coachingText)}
              disabled={
                !coachingText.trim() || coachingMutation.isPending
              }
            >
              {coachingMutation.isPending ? 'Adding...' : 'Add Note'}
            </Button>
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
