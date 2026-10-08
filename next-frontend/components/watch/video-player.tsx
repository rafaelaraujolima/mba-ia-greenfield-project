"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { PlayIcon } from "@/components/icons/play-icon"
import { PauseIcon } from "@/components/icons/pause-icon"
import { VolumeIcon } from "@/components/icons/volume-icon"
import { VolumeMuteIcon } from "@/components/icons/volume-mute-icon"

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return "0:00"
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function VideoPlayer({
  className,
  videoId,
}: {
  className?: string
  videoId: string
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = React.useState(false)
  const [duration, setDuration] = React.useState(0)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [volume, setVolume] = React.useState(1)

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setVolume(video.muted ? 0 : video.volume)
  }

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return
    video.volume = value[0]
    video.muted = value[0] === 0
    setVolume(value[0])
  }

  return (
    <div
      data-slot="video-player"
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-[var(--radius-4)] bg-almost-black-1000 shadow-card",
        className
      )}
    >
      <video
        ref={videoRef}
        src={`/api/videos/${videoId}/stream`}
        className="size-full"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
        <Slider
          aria-label="Progresso do vídeo"
          value={[currentTime]}
          max={duration || 1}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pausar" : "Reproduzir"}
              aria-pressed={playing}
              className="flex size-9 items-center justify-center rounded-[var(--radius-full)] text-white hover:bg-white/10 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {playing ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={volume === 0 ? "Ativar som" : "Mudo"}
              className="flex size-9 items-center justify-center rounded-[var(--radius-full)] text-white hover:bg-white/10 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {volume === 0 ? (
                <VolumeMuteIcon className="size-5" />
              ) : (
                <VolumeIcon className="size-5" />
              )}
            </button>

            <Slider
              aria-label="Volume"
              value={[volume]}
              max={1}
              step={0.05}
              onValueChange={handleVolumeChange}
              className="w-24 cursor-pointer"
            />

            <span className="text-caption text-white">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export { VideoPlayer }
