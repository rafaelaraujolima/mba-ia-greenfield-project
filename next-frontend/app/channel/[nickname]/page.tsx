import { notFound } from "next/navigation"

import { upstream } from "@/lib/api/upstream"
import { normalizePage, getPaginationWindow } from "@/lib/pagination"
import { ChannelHeader } from "@/components/channel/channel-header"
import { VideoSortFilter } from "@/components/channel/video-sort-filter"
import { VideoCard } from "@/components/channel/video-card"
import { PaginationLinks } from "@/components/common/pagination-links"

const PAGE_SIZE = 10

// The upstream `GET /channels/{nickname}/videos` accepts `page`/`pageSize`
// query params at runtime, but (same backend OpenAPI-documentation gap as
// `GET /channels/{id}/manage/videos`, see `app/(studio)/studio/videos/page.tsx`)
// the controller lacks `@ApiQuery` decorators, so the generated `paths` type
// documents this operation's query params as `never`. Bridge it narrowly for
// this one call so the typed client still serializes the params at runtime.
type ChannelVideosQuery = { page?: number; pageSize?: number }

export default async function ChannelPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ nickname: string }>
  searchParams: Promise<{ page?: string | string[] }>
}>) {
  const { nickname } = await params
  const { page: rawPage } = await searchParams
  const page = normalizePage(rawPage)

  // Anonymous page: calls the plain `upstream` client (no bearer token) —
  // `GET /channels/{nickname}` and `GET /channels/{nickname}/videos` are
  // public endpoints (§Authorization Matrix).
  const [channelResult, videosResult] = await Promise.all([
    upstream.GET("/channels/{nickname}", {
      params: { path: { nickname } },
    }),
    upstream.GET("/channels/{nickname}/videos", {
      params: {
        path: { nickname },
        query: { page, pageSize: PAGE_SIZE } satisfies ChannelVideosQuery as unknown as never,
      },
    }),
  ])

  if (channelResult.error) {
    if (channelResult.response.status === 404) {
      notFound()
    }
    const message = Array.isArray(channelResult.error.message)
      ? channelResult.error.message.join(", ")
      : channelResult.error.message
    throw new Error(message ?? "Failed to load channel")
  }

  if (videosResult.error) {
    if (videosResult.response.status === 404) {
      notFound()
    }
    const message = Array.isArray(videosResult.error.message)
      ? videosResult.error.message.join(", ")
      : videosResult.error.message
    throw new Error(message ?? "Failed to load channel videos")
  }

  const channel = channelResult.data
  const videos = videosResult.data

  const items = videos.items ?? []
  const total = videos.total ?? 0
  const responsePage = videos.page ?? page
  const responsePageSize = videos.pageSize ?? PAGE_SIZE

  const window = getPaginationWindow({
    page: responsePage,
    pageSize: responsePageSize,
    total,
  })

  return (
    <div className="flex w-full flex-col gap-6 pb-12">
      <ChannelHeader
        className="px-6 pt-8"
        name={channel.name ?? ""}
        nickname={channel.nickname ? `@${channel.nickname}` : ""}
        description={channel.description}
      />

      <VideoSortFilter className="px-6" />

      <div className="flex flex-wrap items-start gap-6 px-6">
        {items.map((video) => (
          <VideoCard
            key={video.id}
            id={video.id ?? ""}
            title={video.title ?? ""}
            channelName={channel.name}
            thumbnailVersion={video.updatedAt}
            durationSeconds={video.durationSeconds}
            publishedAt={video.publishedAt}
            className="w-[266px]"
          />
        ))}
      </div>

      <PaginationLinks window={window} buildHref={(p) => `/channel/${nickname}?page=${p}`} />
    </div>
  )
}
