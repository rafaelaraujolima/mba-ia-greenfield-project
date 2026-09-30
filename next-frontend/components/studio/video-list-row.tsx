import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"
import { VideoStats } from "@/components/studio/video-stats"

function formatRelativeTime(isoDate: string): string {
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" })
  const diffSeconds = (new Date(isoDate).getTime() - Date.now()) / 1000
  const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { amount: 60, unit: "seconds" },
    { amount: 60, unit: "minutes" },
    { amount: 24, unit: "hours" },
    { amount: 30, unit: "days" },
    { amount: 12, unit: "months" },
    { amount: Number.POSITIVE_INFINITY, unit: "years" },
  ]

  let duration = diffSeconds
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }
  return rtf.format(Math.round(duration), "years")
}

function VideoListRow({
  className,
  id,
  title,
  description,
  thumbnailVersion,
  durationSeconds,
  views,
  likes,
  comments,
  publishedAt,
  statusLabel,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href" | "children"> & {
  id: string
  title: string
  description?: string | null
  thumbnailVersion?: string
  durationSeconds?: number | null
  views?: number | null
  likes?: number | null
  comments?: number | null
  publishedAt?: string | null
  statusLabel: string
}) {
  return (
    <Link
      href={`/studio/videos/${id}/edit`}
      data-slot="video-list-row"
      className={cn(
        "flex h-40 w-full max-w-[1088px] items-center gap-4 rounded-[var(--radius-3)] p-2 hover:bg-muted/40",
        className
      )}
      {...props}
    >
      <VideoThumbnail
        videoId={id}
        version={thumbnailVersion}
        durationSeconds={durationSeconds}
        alt=""
        className="h-36 w-64 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-label-lg text-foreground">{title}</span>
        {description ? (
          <span className="line-clamp-2 text-body-md text-muted-foreground">{description}</span>
        ) : null}
        <VideoStats views={views} likes={likes} comments={comments} />
        <div className="flex items-center gap-2">
          <Badge variant="success">{statusLabel}</Badge>
          {publishedAt ? (
            <span className="text-caption text-muted-foreground">
              {formatRelativeTime(publishedAt)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

export { VideoListRow }
