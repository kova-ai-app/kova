'use client'

import { useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatDuration } from '@/lib/utils'
import type { TranscriptSegment } from '@kova/shared'

interface TranscriptViewerProps {
  segments: TranscriptSegment[]
  currentTime: number
  onSegmentClick: (startSec: number) => void
}

export function TranscriptViewer({
  segments,
  currentTime,
  onSegmentClick,
}: TranscriptViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentTime])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Transcript
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="max-h-96 overflow-y-auto space-y-1"
        >
          {segments.map((seg, i) => {
            const isActive =
              currentTime >= seg.startSec && currentTime < seg.endSec
            return (
              <div
                key={i}
                ref={isActive ? activeRef : undefined}
                onClick={() => onSegmentClick(seg.startSec)}
                className={cn(
                  'flex gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                  isActive
                    ? 'bg-brand-500/10 border border-brand-500/20'
                    : 'hover:bg-accent'
                )}
              >
                <div className="flex flex-col items-center gap-1 min-w-[72px]">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDuration(Math.round(seg.startSec))}
                  </span>
                  <Badge
                    variant={
                      seg.speaker === 'Tech' ? 'default' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {seg.speaker}
                  </Badge>
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">
                    {seg.text}
                    {seg.language === 'es' && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-[10px] align-middle"
                      >
                        ES
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
