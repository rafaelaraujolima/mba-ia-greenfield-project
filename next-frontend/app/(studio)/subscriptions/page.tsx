import { authedUpstream } from "@/lib/api/authed-upstream"
import { getPaginationWindow, normalizePage } from "@/lib/pagination"
import { VideoCard } from "@/components/channel/video-card"
import { PaginationLinks } from "@/components/common/pagination-links"

const PAGE_SIZE = 12

// `page`/`pageSize` are accepted at runtime but not declared in the exported
// contract (same gap as the channel videos listing).
type FeedQuery = { page?: number; pageSize?: number }

/**
 * Feed of the followed channels' videos (social-interactions/TD-07), rendered
 * inside the studio `AppShell` with the existing `VideoCard` grid.
 */
export default async function SubscriptionsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ page?: string | string[] }>
}>) {
  const { page: rawPage } = await searchParams
  const page = normalizePage(rawPage)

  const { data, error } = await authedUpstream().GET("/subscriptions/videos", {
    params: {
      query: { page, pageSize: PAGE_SIZE } satisfies FeedQuery as unknown as never,
    },
  })

  if (error) {
    throw new Error("Failed to load subscriptions feed")
  }

  const items = data.items ?? []
  const window = getPaginationWindow({
    page: data.page ?? page,
    pageSize: data.pageSize ?? PAGE_SIZE,
    total: data.total ?? 0,
  })

  return (
    <div className="flex w-full flex-col gap-6 px-6 pt-8 pb-12">
      <h1 className="text-h1 text-foreground">Subscriptions</h1>

      {items.length === 0 ? (
        <p className="text-body-md text-muted-foreground">
          Videos from the channels you follow will show up here.
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          {items.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id ?? ""}
              title={video.title ?? ""}
              channelName={video.channelName}
              thumbnailVersion={video.updatedAt}
              durationSeconds={video.durationSeconds}
              publishedAt={video.publishedAt}
              className="w-[266px]"
            />
          ))}
        </div>
      )}

      <PaginationLinks window={window} buildHref={(p) => `/subscriptions?page=${p}`} />
    </div>
  )
}
