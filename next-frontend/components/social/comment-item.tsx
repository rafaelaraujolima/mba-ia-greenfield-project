"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { CommentItem as CommentData, CommentReplies } from "@/lib/api/contracts"
import { formatRelativeTime } from "@/lib/format-relative-time"
import { useSession } from "@/hooks/use-session"
import { usePathname, useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CommentForm } from "@/components/social/comment-form"
import { CommentReactionButtons } from "@/components/social/comment-reaction-buttons"

/**
 * One comment. Top-level comments can be replied to and expose their replies
 * behind a "Ver N respostas" toggle, loaded on demand (social-interactions/TD-04:
 * maximum depth 2, so replies have no Reply button). The body is rendered as
 * plain text — React escapes it (social-interactions/TD-09).
 */
function CommentItem({
  className,
  videoId,
  comment,
}: {
  className?: string
  videoId: string
  comment: CommentData
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn } = useSession()
  const isTopLevel = !comment.parentId

  const [replyCount, setReplyCount] = React.useState(comment.replyCount ?? 0)
  const [showReplies, setShowReplies] = React.useState(false)
  const [replies, setReplies] = React.useState<CommentData[]>([])
  const [repliesCursor, setRepliesCursor] = React.useState<string | null>(null)
  const [repliesLoaded, setRepliesLoaded] = React.useState(false)
  const [loadingReplies, setLoadingReplies] = React.useState(false)
  const [repliesError, setRepliesError] = React.useState<string | null>(null)
  const [replyFormOpen, setReplyFormOpen] = React.useState(false)

  const authorName = comment.author?.channelName ?? ""

  async function loadReplies(cursor: string | null) {
    setLoadingReplies(true)
    setRepliesError(null)
    try {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
      const response = await fetch(`/api/comments/${comment.id}/replies${query}`)
      if (!response.ok) {
        setRepliesError("Could not load replies. Try again.")
        return
      }
      const page = (await response.json()) as CommentReplies
      setReplies((current) => [...current, ...(page.items ?? [])])
      setRepliesCursor(page.nextCursor ?? null)
      setRepliesLoaded(true)
    } catch {
      setRepliesError("Could not load replies. Try again.")
    } finally {
      setLoadingReplies(false)
    }
  }

  async function onToggleReplies() {
    const next = !showReplies
    setShowReplies(next)
    if (next && !repliesLoaded) {
      await loadReplies(null)
    }
  }

  function onReplyClick() {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname ?? "/")}`)
      return
    }
    setReplyFormOpen((open) => !open)
  }

  function onReplyCreated(created: CommentData) {
    setReplyFormOpen(false)
    setReplyCount((count) => count + 1)
    setShowReplies(true)
    if (repliesLoaded) {
      setReplies((current) => [created, ...current])
    } else {
      // Replies not fetched yet: fetch the whole page so ordering is the server's.
      void loadReplies(null)
    }
  }

  return (
    <article
      data-slot="comment-item"
      className={cn("flex items-start gap-4", className)}
    >
      <Avatar size="lg">
        <AvatarFallback>{authorName.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2 text-caption text-muted-foreground">
          <span className="text-label-md text-foreground">
            @{comment.author?.channelNickname}
          </span>
          {comment.createdAt ? (
            <time dateTime={comment.createdAt}>
              {formatRelativeTime(comment.createdAt)}
            </time>
          ) : null}
        </div>

        <p
          data-slot="comment-body"
          className="whitespace-pre-wrap break-words text-body-md text-foreground"
        >
          {comment.body}
        </p>

        <div className="flex items-center gap-2">
          <CommentReactionButtons
            commentId={comment.id ?? ""}
            reaction={comment.viewerState?.reaction ?? null}
            likeCount={comment.likeCount ?? 0}
          />
          {isTopLevel ? (
            <Button
              type="button"
              variant="ghost"
              className="min-w-0 px-3 py-1 text-body-md text-muted-foreground"
              aria-expanded={replyFormOpen}
              onClick={onReplyClick}
            >
              Reply
            </Button>
          ) : null}
        </div>

        {replyFormOpen ? (
          <CommentForm
            videoId={videoId}
            parentId={comment.id}
            placeholder="Add a reply..."
            autoFocus
            onCreated={onReplyCreated}
            onCancel={() => setReplyFormOpen(false)}
          />
        ) : null}

        {isTopLevel && replyCount > 0 ? (
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="ghost"
              className="w-fit min-w-0 px-3 py-1 text-body-md text-link"
              aria-expanded={showReplies}
              onClick={onToggleReplies}
            >
              {showReplies
                ? `Ocultar ${replyCount === 1 ? "resposta" : "respostas"}`
                : `Ver ${replyCount} ${replyCount === 1 ? "resposta" : "respostas"}`}
            </Button>

            {showReplies ? (
              <div className="flex flex-col gap-4 pl-4" data-slot="comment-replies">
                {replies.map((reply) => (
                  <CommentItem key={reply.id} videoId={videoId} comment={reply} />
                ))}
                {repliesError ? (
                  <p role="alert" className="text-caption text-destructive">
                    {repliesError}
                  </p>
                ) : null}
                {repliesCursor ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-fit min-w-0 px-3 py-1 text-body-md"
                    disabled={loadingReplies}
                    onClick={() => loadReplies(repliesCursor)}
                  >
                    Carregar mais respostas
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}

export { CommentItem }
