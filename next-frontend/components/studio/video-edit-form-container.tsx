"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { VideoEditForm, VideoEditSubmitError } from "@/components/studio/video-edit-form"

type VideoStatus = "processing" | "ready" | "failed"

type ContainerVideo = {
  id: string
  title: string
  description: string | null
  categoryId: string
  visibility: "public" | "unlisted"
  status: VideoStatus
  publishedAt: string | null
  videoLink: string
  durationSeconds: number | null
  height: number | null
  thumbnailVersion?: string
}

type ContainerCategory = {
  id: string
  name: string
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
 * Owns the `fetch` calls to this screen's Route Handlers (`PATCH
 * /api/videos/[id]`, `POST /api/videos/[id]/thumbnail`, `POST
 * /api/videos/[id]/publish`) and maps their error envelopes onto
 * `VideoEditForm`'s presentation contract (field-level errors via
 * `VideoEditSubmitError`, or a thrown `Error` for the form-level message).
 *
 * `page.tsx` stays a pure RSC — it cannot pass functions as props to a
 * Client Component (only Server Actions can cross that boundary, and this
 * project's established mutation pattern, used throughout phase-02/04, is
 * Route Handler + `fetch` + `router.refresh()`, not Server Actions). This
 * container is the "use client" boundary that owns that fetch logic so
 * `VideoEditForm` itself (SI-04.0.22) stays purely presentational.
 */
function VideoEditFormContainer({
  video,
  categories,
}: {
  video: ContainerVideo
  categories: ContainerCategory[]
}) {
  const router = useRouter()

  const onSave = React.useCallback(
    async (values: {
      title: string
      description?: string
      categoryId: string
      visibility: "public" | "unlisted"
      thumbnailFile: File | null
    }) => {
      const patchResponse = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          description: values.description ?? null,
          categoryId: values.categoryId,
          visibility: values.visibility,
        }),
      })

      if (!patchResponse.ok) {
        const body = await readErrorEnvelope(patchResponse)

        if (body.error === "UNAUTHORIZED") {
          redirectToLogin(router)
          return
        }
        if (body.error === "CATEGORY_NOT_FOUND") {
          throw new VideoEditSubmitError(
            errorMessage(body, "Category not found"),
            "categoryId"
          )
        }
        if (body.error === "VIDEO_NOT_OWNED") {
          throw new VideoEditSubmitError(
            "You don't have permission to edit this video."
          )
        }
        throw new VideoEditSubmitError(errorMessage(body, "Failed to save changes"))
      }

      if (values.thumbnailFile) {
        const formData = new FormData()
        formData.append("thumbnail", values.thumbnailFile)

        const thumbnailResponse = await fetch(`/api/videos/${video.id}/thumbnail`, {
          method: "POST",
          body: formData,
        })

        if (!thumbnailResponse.ok) {
          const body = await readErrorEnvelope(thumbnailResponse)

          if (body.error === "UNAUTHORIZED") {
            redirectToLogin(router)
            return
          }
          if (body.error === "INVALID_FILE_TYPE" || body.error === "THUMBNAIL_SIZE_EXCEEDED") {
            throw new VideoEditSubmitError(
              errorMessage(body, "Invalid thumbnail"),
              "thumbnail"
            )
          }
          if (body.error === "VIDEO_NOT_OWNED") {
            throw new VideoEditSubmitError(
              "You don't have permission to edit this video."
            )
          }
          throw new VideoEditSubmitError(
            errorMessage(body, "Failed to upload thumbnail")
          )
        }
      }

      router.refresh()
    },
    [router, video.id]
  )

  const onPublish = React.useCallback(async () => {
    const response = await fetch(`/api/videos/${video.id}/publish`, {
      method: "POST",
    })

    if (!response.ok) {
      const body = await readErrorEnvelope(response)

      if (body.error === "UNAUTHORIZED") {
        redirectToLogin(router)
        return
      }
      if (body.error === "INVALID_VIDEO_STATE") {
        // Status may already have changed server-side; refresh so the
        // Status line / Publish button reflect the current state too.
        router.refresh()
        throw new Error(errorMessage(body, "Video is not ready to be published"))
      }
      if (body.error === "VIDEO_NOT_OWNED") {
        throw new Error("You don't have permission to publish this video.")
      }
      throw new Error(errorMessage(body, "Failed to publish video"))
    }

    router.refresh()
  }, [router, video.id])

  const onCancel = React.useCallback(() => {
    router.push("/studio/videos")
  }, [router])

  return (
    <VideoEditForm
      video={video}
      categories={categories}
      onSave={onSave}
      onPublish={onPublish}
      onCancel={onCancel}
    />
  )
}

export { VideoEditFormContainer }
