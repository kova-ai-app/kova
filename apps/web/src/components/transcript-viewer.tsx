'use client'

import type { TranscriptSegment } from '@kova/shared'

export function TranscriptViewer(_props: {
  segments: TranscriptSegment[]
  currentTime: number
  onSegmentClick: (s: number) => void
}) {
  return <div>Transcript viewer placeholder — replaced in Task 8</div>
}
