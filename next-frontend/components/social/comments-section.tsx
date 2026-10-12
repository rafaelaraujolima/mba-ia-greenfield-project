"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { CommentItem as CommentData, CommentList } from "@/lib/api/contracts"
import { formatGroupedCount } from "@/lib/format-count"
import { Button } from "@/components/ui/button"
import { CommentForm } from "@/components/social/comment-form"
import { CommentItem } from "@/components/social/comment-item"

/**
 * Comments of a video (social-interactions/TD-05): the first page comes from
 * the RSC, "carregar mais" accumulates further pages by cursor. Reading is
 * public; writing goes through `CommentForm`.
 */
function CommentsSection({
  className,
  videoId,
  initialItems,
  initialCursor,
  totalCount,
}: {
  className?: string
  videoId: string
  initialItems: CommentData[]
  initialCursor: string | null
  totalCount: number
}) {
  const [items, setItems] = React.useState(initialItems)
  const [cursor, setCursor] = React.useState(initialCursor)
  const [total, setTotal] = React.useState(totalCount)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function loadMore() {
    if (!cursor) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/videos/${videoId}/comments?cursor=${encodeURIComponent(cursor)}`
      )
      if (!response.ok) {
        setError("Could not load more comments. Try again.")
        return
      }
      const page = (await response.json()) as CommentList
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id))
        return [...current, ...(page.items ?? []).filter((item) => !seen.has(item.id))]
      })
      setCursor(page.nextCursor ?? null)
      if (typeof page.totalCount === "number") setTotal(page.totalCount)
    } catch {
      setError("Could not load more comments. Try again.")
    } finally {
      setLoading(false)
    }
  }

  function onCreated(created: CommentData) {
    setItems((current) => [created, ...current])
    setTotal((current) => current + 1)
  }

  return (
    <section
      data-slot="comments-section"
      aria-labelledby="comments-heading"
      className={cn("flex flex-col gap-6", className)}
    >
      <div className="flex items-center gap-6">
        <h2 id="comments-heading" className="text-h3 text-foreground">
          {formatGroupedCount(total)} {total === 1 ? "Comment" : "Comments"}
        </h2>
        <span className="text-body-md text-muted-foreground">Mais recentes</span>
      </div>

      <CommentForm videoId={videoId} onCreated={onCreated} />

      {items.length === 0 ? (
        <p className="text-body-md text-muted-foreground">
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {items.map((comment) => (
            <CommentItem key={comment.id} videoId={videoId} comment={comment} />
          ))}
        </div>
      )}

      {error ? (
        <p role="alert" className="text-caption text-destructive">
          {error}
        </p>
      ) : null}

      {cursor ? (
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          disabled={loading}
          onClick={loadMore}
        >
          Carregar mais
        </Button>
      ) : null}
    </section>
  )
}

export { CommentsSection }
