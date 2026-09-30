import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"

function formatViews(count: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(count ?? 0)
}

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

function VideoCard({
  className,
  id,
  title,
  channelName,
  thumbnailVersion,
  durationSeconds,
  views,
  publishedAt,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href" | "children"> & {
  id: string
  title: string
  channelName?: string | null
  thumbnailVersion?: string
  durationSeconds?: number | null
  views?: number | null
  publishedAt?: string | null
}) {
  return (
    <Link
      href={`/watch/${id}`}
      aria-label={title}
      data-slot="video-card"
      className={cn("flex w-64 flex-col gap-2", className)}
      {...props}
    >
      <VideoThumbnail
        videoId={id}
        version={thumbnailVersion}
        durationSeconds={durationSeconds}
        alt=""
        className="aspect-video w-full"
      />
      <span className="line-clamp-2 text-body-lg text-foreground">{title}</span>
      <span className="flex flex-col gap-0.5">
        {channelName ? (
          <span className="text-body-lg text-muted-foreground">{channelName}</span>
        ) : null}
        <span className="text-body-lg text-muted-foreground">
          {formatViews(views)} views
          {publishedAt ? ` • ${formatRelativeTime(publishedAt)}` : null}
        </span>
      </span>
    </Link>
  )
}

export { VideoCard }
