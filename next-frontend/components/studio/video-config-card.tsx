"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function formatQuality(height: number | null | undefined): string | null {
  if (height == null) return null
  return `${height}p`
}

function VideoConfigCard({
  className,
  videoLink,
  durationSeconds,
  height,
  onCopyLink = (link) => navigator.clipboard.writeText(link),
  ...props
}: React.ComponentProps<"div"> & {
  videoLink: string
  durationSeconds?: number | null
  height?: number | null
  /** Defaults to navigator.clipboard.writeText; injectable so callers/tests can
   *  observe or replace the copy side-effect without stubbing browser globals. */
  onCopyLink?: (link: string) => void | Promise<void>
}) {
  const [copied, setCopied] = React.useState(false)
  const quality = formatQuality(height)

  const handleCopy = async () => {
    await onCopyLink(videoLink)
    setCopied(true)
  }

  return (
    <Card
      data-slot="video-config-card"
      className={cn("flex w-[328px] shrink-0 flex-col gap-4 p-4", className)}
      {...props}
    >
      <div
        data-slot="video-config-preview"
        className="flex h-40 items-center justify-center rounded-[var(--radius-3)] bg-almost-black-1000 text-white text-caption"
      >
        {durationSeconds != null ? formatDuration(durationSeconds) : "0:00"}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label-md text-muted-foreground">Video link</span>
        <div className="flex items-center gap-2">
          <span className="truncate text-body-md text-foreground">{videoLink}</span>
          <button
            type="button"
            aria-label="Copy video link"
            onClick={handleCopy}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {quality ? (
        <div className="flex flex-col gap-1">
          <span className="text-label-md text-muted-foreground">Video Quality</span>
          <span className="text-body-md text-foreground">{quality}</span>
        </div>
      ) : null}
    </Card>
  )
}

export { VideoConfigCard }
