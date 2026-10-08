import { notFound } from "next/navigation"

import { upstream } from "@/lib/api/upstream"
import { VideoPlayer } from "@/components/watch/video-player"
import { ChannelInfo } from "@/components/watch/channel-info"
import { VideoMeta } from "@/components/watch/video-meta"
import { DownloadAction } from "@/components/watch/download-action"
import { DescriptionText } from "@/components/watch/description-text"
import { SuggestionsSidebar } from "@/components/watch/suggestions-sidebar"
import { ViewBeacon } from "@/components/watch/view-beacon"

// This route is anonymous (video-watch-page/TD-04, TD-06) and uncached — the
// same RSC pattern already validated by `/channel/[nickname]`: no
// requireSession(), calls the plain `upstream` client (no bearer token).
export const dynamic = "force-dynamic"

export default async function WatchPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>
}>) {
  const { id } = await params

  const [videoResult, suggestionsResult] = await Promise.all([
    upstream.GET("/videos/{id}", { params: { path: { id } } }),
    upstream.GET("/videos/{id}/suggestions", { params: { path: { id } } }),
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

  const video = videoResult.data
  const suggestions = suggestionsResult.error ? [] : (suggestionsResult.data.items ?? [])

  return (
    <div className="flex w-full items-start gap-6 p-6">
      <ViewBeacon videoId={id} />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <VideoPlayer videoId={id} />

        <div className="flex flex-col gap-3.5">
          <h1 className="text-h1 text-foreground">{video.title}</h1>

          <div className="flex items-center justify-between">
            <ChannelInfo
              channelName={video.channelName ?? ""}
              channelNickname={video.channelNickname}
            />
            <DownloadAction videoId={id} />
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-[var(--radius-2)] border border-border bg-card p-3.5">
          <VideoMeta viewCount={video.viewCount ?? 0} publishedAt={video.publishedAt ?? video.createdAt ?? ""} />
          <DescriptionText className="border-0 p-0" description={video.description ?? ""} />
        </div>
      </div>

      <div className="w-[411px] shrink-0">
        <SuggestionsSidebar videos={suggestions} />
      </div>
    </div>
  )
}
