'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Pause } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

const SPEED_OPTIONS = [0.75, 1, 1.5, 2]

interface AudioPlayerProps {
  src: string
  onTimeUpdate: (time: number) => void
  seekTo: number | null
  onSeeked: () => void
}

export function AudioPlayer({
  src,
  onTimeUpdate,
  seekTo,
  onSeeked,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)

  // External seek (from transcript click or opportunity timestamp)
  useEffect(() => {
    if (seekTo !== null && audioRef.current) {
      audioRef.current.currentTime = seekTo
      onSeeked()
    }
  }, [seekTo, onSeeked])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return
    const t = audioRef.current.currentTime
    setCurrentTime(t)
    onTimeUpdate(t)
  }, [onTimeUpdate])

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = Number(e.target.value)
      if (audioRef.current) {
        audioRef.current.currentTime = t
      }
      setCurrentTime(t)
    },
    []
  )

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(speed)
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]
    setSpeed(next)
    if (audioRef.current) {
      audioRef.current.playbackRate = next
    }
  }, [speed])

  return (
    <Card>
      <CardContent className="pt-6">
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() =>
            setDuration(audioRef.current?.duration ?? 0)
          }
          onEnded={() => setIsPlaying(false)}
          preload="metadata"
        />
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={togglePlay}>
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <span className="text-sm text-muted-foreground w-16 tabular-nums">
            {formatDuration(Math.round(currentTime))}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 accent-brand-600 cursor-pointer"
            step={0.1}
          />

          <span className="text-sm text-muted-foreground w-16 tabular-nums text-right">
            {formatDuration(Math.round(duration))}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={cycleSpeed}
            className="w-14 tabular-nums"
          >
            {speed}x
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
