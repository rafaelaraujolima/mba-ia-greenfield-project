import { notFound } from "next/navigation"

import { upstream } from "@/lib/api/upstream"
import { optionalAuthedUpstream } from "@/lib/api/optional-authed-upstream"
import type { CommentItem } from "@/lib/api/contracts"
import { VideoPlayer } from "@/components/watch/video-player"
import { ChannelInfo } from "@/components/watch/channel-info"
import { VideoMeta } from "@/components/watch/video-meta"
import { DownloadAction } from "@/components/watch/download-action"
import { DescriptionText } from "@/components/watch/description-text"
import { SuggestionsSidebar } from "@/components/watch/suggestions-sidebar"
import { VideoReactionButtons } from "@/components/watch/video-reaction-buttons"
import { ViewBeacon } from "@/components/watch/view-beacon"
import { SubscribeButton } from "@/components/social/subscribe-button"
import { CommentsSection } from "@/components/social/comments-section"

// This route is anonymous (video-watch-page/TD-04) and uncached. The viewer
// state (own reaction, subscription, ownership) comes in the same response
// when a session exists, through `optionalAuthedUpstream` — no
// requireSession(), an expired token falls back to the anonymous read
// (social-interactions/TD-06, superseding video-watch-page/TD-06).
export const dynamic = "force-dynamic"

// `GET /videos/{id}/comments` query params are not in the exported contract
// (same documentation gap as the channel videos listing).
type CommentsQuery = { cursor?: string; limit?: number }

export default async function WatchPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>
}>) {
  const { id } = await params
  const reader = optionalAuthedUpstream()

  const [videoResult, suggestionsResult, commentsResult] = await Promise.all([
    reader.GET("/videos/{id}", { params: { path: { id } } }),
    upstream.GET("/videos/{id}/suggestions", { params: { path: { id } } }),
    reader.GET("/videos/{id}/comments", {
      params: {
        path: { id },
        query: {} satisfies CommentsQuery as unknown as never,
      },
    }),
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
  const comments = commentsResult.error ? null : commentsResult.data
  const viewerState = video.viewerState ?? null

  return (
    <div className="flex w-full items-start gap-6 p-6">
      <ViewBeacon videoId={id} />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <VideoPlayer videoId={id} />

        <div className="flex flex-col gap-3.5">
          <h1 className="text-h1 text-foreground">{video.title}</h1>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ChannelInfo
              channelName={video.channelName ?? ""}
              channelNickname={video.channelNickname}
              subscriberCount={video.channelSubscriberCount ?? 0}
              action={
                video.channelNickname ? (
                  <SubscribeButton
                    nickname={video.channelNickname}
                    subscribed={viewerState?.subscribed ?? false}
                    isChannelOwner={viewerState?.isChannelOwner ?? false}
                  />
                ) : null
              }
            />
            <div className="flex items-center gap-2">
              <VideoReactionButtons
                videoId={id}
                reaction={viewerState?.reaction ?? null}
                likeCount={video.likeCount ?? 0}
              />
              <DownloadAction videoId={id} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-[var(--radius-2)] border border-border bg-card p-3.5">
          <VideoMeta viewCount={video.viewCount ?? 0} publishedAt={video.publishedAt ?? video.createdAt ?? ""} />
          <DescriptionText className="border-0 p-0" description={video.description ?? ""} />
        </div>

        <CommentsSection
          className="pt-2"
          videoId={id}
          initialItems={(comments?.items ?? []) as CommentItem[]}
          initialCursor={comments?.nextCursor ?? null}
          totalCount={comments?.totalCount ?? 0}
        />
      </div>

      <div className="w-[411px] shrink-0">
        <SuggestionsSidebar videos={suggestions} />
      </div>
    </div>
  )
}
