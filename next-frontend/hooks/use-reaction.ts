"use client"

import { useOptimistic, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useSession } from "@/hooks/use-session"

export type ReactionType = "like" | "dislike"

type ReactionState = {
  reaction: ReactionType | null
  likeCount: number
}

type UseReactionOptions = {
  /** Same-origin BFF endpoint, e.g. `/api/videos/{id}/reaction`. */
  endpoint: string
  reaction: ReactionType | null
  likeCount: number
}

function next(state: ReactionState, target: ReactionType | null): ReactionState {
  const likeDelta =
    (target === "like" ? 1 : 0) - (state.reaction === "like" ? 1 : 0)
  return { reaction: target, likeCount: state.likeCount + likeDelta }
}

/**
 * Optimistic like/dislike toggle (social-interactions/TD-08): flips icon and
 * count immediately, calls `PUT`/`DELETE`, and reconciles with
 * `router.refresh()`. A failed call reverts automatically when the transition
 * ends; `401` and anonymous visitors go to `/login?next=<current path>`.
 */
export function useReaction({ endpoint, reaction, likeCount }: UseReactionOptions) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn } = useSession()
  const [pending, startTransition] = useTransition()
  const [state, setOptimistic] = useOptimistic<ReactionState, ReactionType | null>(
    { reaction, likeCount },
    next
  )

  function goToLogin() {
    router.push(`/login?next=${encodeURIComponent(pathname ?? "/")}`)
  }

  function toggle(type: ReactionType) {
    if (!isLoggedIn) {
      goToLogin()
      return
    }

    const target = state.reaction === type ? null : type

    startTransition(async () => {
      setOptimistic(target)
      try {
        const response =
          target === null
            ? await fetch(endpoint, { method: "DELETE" })
            : await fetch(endpoint, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: target }),
              })

        if (response.status === 401) {
          goToLogin()
          return
        }
      } catch {
        // Network failure: the optimistic state reverts when the transition ends.
      }
      router.refresh()
    })
  }

  return { reaction: state.reaction, likeCount: state.likeCount, pending, toggle }
}
