import { cn } from "@/lib/utils"

function formatViews(count: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(count)
}

function formatRelativeDate(isoDate: string): string {
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

function VideoMeta({
  className,
  viewCount,
  publishedAt,
}: {
  className?: string
  viewCount: number
  publishedAt: string
}) {
  return (
    <div
      data-slot="video-meta"
      className={cn("flex items-center gap-2 text-body-md text-foreground", className)}
    >
      <span data-slot="view-count">{formatViews(viewCount)} views</span>
      <span>• {formatRelativeDate(publishedAt)}</span>
    </div>
  )
}

export { VideoMeta }
