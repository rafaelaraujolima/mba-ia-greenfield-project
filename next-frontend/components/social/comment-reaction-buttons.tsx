"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { formatGroupedCount } from "@/lib/format-count"
import { useReaction, type ReactionType } from "@/hooks/use-reaction"
import { Button } from "@/components/ui/button"
import { ThumbsUpIcon } from "@/components/icons/thumbs-up-icon"
import { ThumbsDownIcon } from "@/components/icons/thumbs-down-icon"

/** Like (with simple count) and dislike (no count) of a single comment. */
function CommentReactionButtons({
  className,
  commentId,
  reaction,
  likeCount,
}: {
  className?: string
  commentId: string
  reaction: ReactionType | null
  likeCount: number
}) {
  const state = useReaction({
    endpoint: `/api/comments/${commentId}/reaction`,
    reaction,
    likeCount,
  })

  return (
    <div
      data-slot="comment-reaction-buttons"
      className={cn("flex items-center gap-1", className)}
    >
      <Button
        type="button"
        variant="ghost"
        aria-label="Like comment"
        aria-pressed={state.reaction === "like"}
        onClick={() => state.toggle("like")}
        className="min-w-0 gap-1 px-2 py-1 [&_svg]:size-4"
      >
        <ThumbsUpIcon filled={state.reaction === "like"} />
        <span data-slot="comment-like-count">
          {formatGroupedCount(state.likeCount)}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-label="Dislike comment"
        aria-pressed={state.reaction === "dislike"}
        onClick={() => state.toggle("dislike")}
        className="min-w-0 px-2 py-1 [&_svg]:size-4"
      >
        <ThumbsDownIcon filled={state.reaction === "dislike"} />
      </Button>
    </div>
  )
}

export { CommentReactionButtons }
