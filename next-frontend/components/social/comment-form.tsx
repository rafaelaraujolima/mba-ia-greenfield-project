"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import type { CommentItem } from "@/lib/api/contracts"
import { useSession } from "@/hooks/use-session"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Mirrors COMMENT_BODY_MAX_LENGTH in nestjs-project/src/comments/comments.constants.ts.
const COMMENT_BODY_MAX_LENGTH = 5000

type ErrorEnvelope = { error?: string; message?: string | string[] }

function messageFor(body: ErrorEnvelope): string {
  switch (body.error) {
    case "VIDEO_NOT_FOUND":
      return "This video is no longer available."
    case "COMMENT_NOT_FOUND":
      return "The comment you are replying to no longer exists."
    case "COMMENT_DEPTH_EXCEEDED":
      return "Replies to replies are not supported."
  }
  if (Array.isArray(body.message)) return body.message.join(", ")
  return body.message ?? "Could not post your comment. Try again."
}

/**
 * Comment/reply form (social-interactions/TD-09: plain text). Posts to
 * `POST /api/videos/{id}/comments` with `{ body, parentId? }` and hands the
 * created comment to `onCreated`.
 */
function CommentForm({
  className,
  videoId,
  parentId,
  placeholder = "Add a comment...",
  autoFocus = false,
  onCreated,
  onCancel,
}: {
  className?: string
  videoId: string
  parentId?: string
  placeholder?: string
  autoFocus?: boolean
  onCreated: (comment: CommentItem) => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, channelSlug } = useSession()
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const label = parentId ? "Add a reply" : "Add a comment"

  function goToLogin() {
    router.push(`/login?next=${encodeURIComponent(pathname ?? "/")}`)
  }

  async function onSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isLoggedIn) {
      goToLogin()
      return
    }

    const body = value.trim()
    if (body.length === 0) {
      setError("Write something before posting.")
      return
    }
    if (body.length > COMMENT_BODY_MAX_LENGTH) {
      setError(`Comments can have up to ${COMMENT_BODY_MAX_LENGTH} characters.`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parentId ? { body, parentId } : { body }),
      })

      if (response.status === 401) {
        goToLogin()
        return
      }
      if (!response.ok) {
        const envelope = (await response.json().catch(() => ({}))) as ErrorEnvelope
        setError(messageFor(envelope))
        return
      }

      const created = (await response.json()) as CommentItem
      setValue("")
      onCreated(created)
    } catch {
      setError("Could not post your comment. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      data-slot="comment-form"
      onSubmit={onSubmit}
      noValidate
      className={cn("flex flex-col gap-2", className)}
    >
      <div className="flex items-start gap-4">
        <Avatar size="lg">
          <AvatarFallback>
            {(channelSlug || "?").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Input
          aria-label={label}
          placeholder={placeholder}
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={error ? true : undefined}
          className="rounded-none border-0 border-b bg-transparent px-0"
        />
      </div>
      {error ? (
        <p role="alert" className="text-caption text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {parentId ? "Reply" : "Comment"}
        </Button>
      </div>
    </form>
  )
}

export { CommentForm }
