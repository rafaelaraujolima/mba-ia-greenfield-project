import { cn } from "@/lib/utils"
import { DownloadIcon } from "@/components/icons/download-icon"

function DownloadAction({
  className,
  videoId,
}: {
  className?: string
  videoId: string
}) {
  return (
    <a
      data-slot="download-action"
      href={`/api/videos/${videoId}/download`}
      download
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-full)] border border-border bg-secondary px-4 py-2 text-label-md text-foreground hover:bg-secondary/80 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <DownloadIcon className="size-5" />
      Download
    </a>
  )
}

export { DownloadAction }
