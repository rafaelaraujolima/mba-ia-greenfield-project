import { notFound } from "next/navigation"

import { authedUpstream } from "@/lib/api/authed-upstream"
import { Card } from "@/components/ui/card"
import { VideoEditFormContainer } from "@/components/studio/video-edit-form-container"

export default async function EditVideoPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>
}>) {
  const { id } = await params

  const [videoResult, categoriesResult] = await Promise.all([
    authedUpstream().GET("/videos/{id}", { params: { path: { id } } }),
    authedUpstream().GET("/categories", {}),
  ])

  if (videoResult.error) {
    if (videoResult.response.status === 404) {
      notFound()
    }
    const message = Array.isArray(videoResult.error.message)
      ? videoResult.error.message.join(", ")
      : videoResult.error.message
    throw new Error(message ?? "Failed to load video")
  }

  // GET /categories documents no error responses in the upstream contract
  // (only a 200 array) — no error branch to handle here.
  const video = videoResult.data
  const categories = categoriesResult.data ?? []

  return (
    <div className="flex w-full flex-col gap-6 px-6 pb-6 pt-8">
      <h1 className="text-h1 text-foreground">Edit video</h1>

      <Card className="w-full gap-6 p-8">
        <VideoEditFormContainer
          video={{
            id: video.id ?? id,
            title: video.title ?? "",
            description: video.description ?? null,
            categoryId: video.categoryId ?? "",
            visibility: (video.visibility as "public" | "unlisted") ?? "public",
            status: (video.status as "processing" | "ready" | "failed") ?? "processing",
            publishedAt: video.publishedAt ?? null,
            videoLink: `/watch/${video.id ?? id}`,
            durationSeconds: video.durationSeconds ?? null,
            height: video.height ?? null,
            thumbnailVersion: video.updatedAt,
          }}
          categories={categories.map((category) => ({
            id: category.id ?? "",
            name: category.name ?? "",
          }))}
        />
      </Card>
    </div>
  )
}
