"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { formatCompactCount } from "@/lib/format-count"
import { useReaction, type ReactionType } from "@/hooks/use-reaction"
import { Button } from "@/components/ui/button"
import { ThumbsUpIcon } from "@/components/icons/thumbs-up-icon"
import { ThumbsDownIcon } from "@/components/icons/thumbs-down-icon"

function VideoReactionButtons({
  className,
  videoId,
  reaction,
  likeCount,
}: {
  className?: string
  videoId: string
  reaction: ReactionType | null
  likeCount: number
}) {
  const state = useReaction({
    endpoint: `/api/videos/${videoId}/reaction`,
    reaction,
    likeCount,
  })

  return (
    <div
      data-slot="video-reaction-buttons"
      className={cn("flex items-center gap-2", className)}
    >
      <Button
        type="button"
        variant="secondary"
        aria-label="Like"
        aria-pressed={state.reaction === "like"}
        onClick={() => state.toggle("like")}
      >
        <ThumbsUpIcon filled={state.reaction === "like"} />
        <span data-slot="like-count">{formatCompactCount(state.likeCount)}</span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        aria-label="Dislike"
        aria-pressed={state.reaction === "dislike"}
        onClick={() => state.toggle("dislike")}
      >
        <ThumbsDownIcon filled={state.reaction === "dislike"} />
      </Button>
    </div>
  )
}

export { VideoReactionButtons }
