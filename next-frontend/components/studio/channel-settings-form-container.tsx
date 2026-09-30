"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { ChannelSettingsForm } from "@/components/studio/channel-settings-form"

type ContainerChannel = {
  id: string
  nickname: string
  name: string
  description: string | null
  updatedAt: string
}

type ErrorEnvelope = {
  error?: string
  message?: string | string[]
}

function errorMessage(body: ErrorEnvelope, fallback: string): string {
  if (Array.isArray(body.message)) return body.message.join(", ")
  return body.message ?? fallback
}

async function readErrorEnvelope(response: Response): Promise<ErrorEnvelope> {
  return (await response.json().catch(() => ({}))) as ErrorEnvelope
}

function redirectToLogin(router: ReturnType<typeof useRouter>) {
  const next = typeof window !== "undefined" ? window.location.pathname : "/"
  router.push(`/login?next=${encodeURIComponent(next)}`)
}

/**
 * Owns the `fetch` call to this screen's Route Handler (`PATCH
 * /api/channels/[id]`) and maps its error envelope onto
 * `ChannelSettingsForm`'s presentation contract — `NICKNAME_ALREADY_EXISTS`
 * is surfaced by throwing an `Error` whose message the form itself already
 * matches against (per SI-04.0.18) to set the inline "Channel handle" field
 * error; `UNAUTHORIZED` redirects to `/login?next=`; other errors are
 * re-thrown so they don't fail silently.
 *
 * `page.tsx` stays a pure RSC — mirrors `video-edit-form-container.tsx`'s
 * established pattern (Route Handler + `fetch` + `router.refresh()`, not
 * Server Actions) so `ChannelSettingsForm` itself stays purely presentational.
 */
function ChannelSettingsFormContainer({ channel }: { channel: ContainerChannel }) {
  const router = useRouter()

  const onSubmit = React.useCallback(
    async (values: { nickname: string; name: string; description?: string }) => {
      const response = await fetch(`/api/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: values.nickname,
          name: values.name,
          description: values.description ?? null,
        }),
      })

      if (!response.ok) {
        const body = await readErrorEnvelope(response)

        if (body.error === "UNAUTHORIZED") {
          redirectToLogin(router)
          return
        }
        if (body.error === "NICKNAME_ALREADY_EXISTS") {
          throw new Error("NICKNAME_ALREADY_EXISTS")
        }
        throw new Error(errorMessage(body, "Failed to save changes"))
      }

      router.refresh()
    },
    [router, channel.id]
  )

  const onCancel = React.useCallback(() => {
    router.push("/studio/videos")
  }, [router])

  return <ChannelSettingsForm channel={channel} onSubmit={onSubmit} onCancel={onCancel} />
}

export { ChannelSettingsFormContainer }
