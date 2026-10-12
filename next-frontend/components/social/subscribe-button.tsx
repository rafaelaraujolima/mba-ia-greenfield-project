"use client"

import * as React from "react"
import { useOptimistic, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useSession } from "@/hooks/use-session"
import { Button } from "@/components/ui/button"

/**
 * Subscribe/Inscrito toggle (social-interactions/TD-08). Hidden for the
 * channel owner (decided by the RSC through `viewerState.isChannelOwner`);
 * anonymous visitors are sent to `/login?next=<current path>`.
 */
function SubscribeButton({
  className,
  nickname,
  subscribed,
  isChannelOwner = false,
}: {
  className?: string
  nickname: string
  subscribed: boolean
  isChannelOwner?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn } = useSession()
  const [pending, startTransition] = useTransition()
  const [isSubscribed, setOptimistic] = useOptimistic(
    subscribed,
    (_current, next: boolean) => next
  )

  if (isChannelOwner) return null

  function goToLogin() {
    router.push(`/login?next=${encodeURIComponent(pathname ?? "/")}`)
  }

  function onClick() {
    if (!isLoggedIn) {
      goToLogin()
      return
    }

    const target = !isSubscribed

    startTransition(async () => {
      setOptimistic(target)
      try {
        const response = await fetch(
          `/api/channels/${encodeURIComponent(nickname)}/subscription`,
          { method: target ? "PUT" : "DELETE" }
        )
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

  return (
    <Button
      type="button"
      data-slot="subscribe-button"
      className={className}
      variant={isSubscribed ? "secondary" : "default"}
      aria-pressed={isSubscribed}
      disabled={pending}
      onClick={onClick}
    >
      {isSubscribed ? "Inscrito" : "Inscrever-se"}
    </Button>
  )
}

export { SubscribeButton }
