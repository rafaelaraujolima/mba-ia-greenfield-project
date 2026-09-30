import * as React from "react"

import { cn } from "@/lib/utils"
import { ViewsIcon } from "@/components/icons/views-icon"
import { ThumbsUpIcon } from "@/components/icons/thumbs-up-icon"
import { CommentIcon } from "@/components/icons/comment-icon"

function formatCount(count: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(count ?? 0)
}

function VideoStats({
  className,
  views,
  likes,
  comments,
  ...props
}: React.ComponentProps<"div"> & {
  views?: number | null
  likes?: number | null
  comments?: number | null
}) {
  return (
    <div
      data-slot="video-stats"
      className={cn("flex items-center gap-4 text-caption text-muted-foreground", className)}
      {...props}
    >
      <span className="flex items-center gap-1">
        <ViewsIcon className="size-4" />
        {formatCount(views)}
      </span>
      <span className="flex items-center gap-1">
        <ThumbsUpIcon className="size-4" />
        {formatCount(likes)}
      </span>
      <span className="flex items-center gap-1">
        <CommentIcon className="size-4" />
        {formatCount(comments)}
      </span>
    </div>
  )
}

export { VideoStats }
