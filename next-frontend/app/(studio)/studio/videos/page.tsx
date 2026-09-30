import Link from "next/link"

import { getSession } from "@/lib/auth/session"
import { authedUpstream } from "@/lib/api/authed-upstream"
import { normalizePage, getPaginationWindow } from "@/lib/pagination"
import { PaginationLinks } from "@/components/common/pagination-links"
import { Button } from "@/components/ui/button"
import { SearchField } from "@/components/ui/search-field"
import { VideoListRow } from "@/components/studio/video-list-row"
import { VideoSortControl } from "@/components/studio/video-sort-control"

const PAGE_SIZE = 10

// The upstream `GET /channels/{id}/manage/videos` accepts `page`/`pageSize`
// query params at runtime (nestjs `ListChannelVideosDto`, bound via
// `@Query()`), but the controller lacks `@ApiQuery` decorators, so
// `openapi.json`/`types.gen.ts` document this operation's query params as
// `never`. This is a backend OpenAPI-documentation gap, out of scope for this
// frontend SI (tracked as a follow-up task) — bridge it narrowly for this one
// call so the typed client still serializes the params at runtime.
type ManageVideosQuery = { page?: number; pageSize?: number }

export default async function StudioVideosPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ page?: string | string[] }>
}>) {
  const { page: rawPage } = await searchParams
  const page = normalizePage(rawPage)

  const session = await getSession()
  const channelId = session.channelId

  const { data, error } = await authedUpstream().GET("/channels/{id}/manage/videos", {
    params: {
      path: { id: channelId },
      query: { page, pageSize: PAGE_SIZE } satisfies ManageVideosQuery as unknown as never,
    },
  })

  if (error) {
    const message = Array.isArray(error.message) ? error.message.join(", ") : error.message
    throw new Error(message ?? "Failed to load videos")
  }

  const items = data.items ?? []
  const total = data.total ?? 0
  const responsePage = data.page ?? page
  const responsePageSize = data.pageSize ?? PAGE_SIZE

  const window = getPaginationWindow({
    page: responsePage,
    pageSize: responsePageSize,
    total,
  })

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-foreground">Channel content</h1>
          <p className="text-body-md text-muted-foreground">Manage your videos and content</p>
        </div>
        <Button asChild variant="default" size="sm" className="rounded-[var(--radius-full)]">
          <Link href="/studio/upload">Upload video</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" disabled>
            Filter
          </Button>
          <Button variant="secondary" size="md" disabled>
            Public
          </Button>
          <Button variant="secondary" size="md" disabled>
            Date
          </Button>
        </div>
        <SearchField
          disabled
          placeholder="Search your videos"
          aria-label="Search your videos"
          className="w-[259px]"
        />
      </div>

      <div className="flex flex-col gap-4 px-6 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-body-md text-muted-foreground">{total} videos</p>
          <VideoSortControl />
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-body-md text-muted-foreground">
              You haven&apos;t uploaded any videos yet.
            </p>
            <Button asChild variant="default" size="sm" className="rounded-[var(--radius-full)]">
              <Link href="/studio/upload">Upload video</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {items.map((video) => (
              <VideoListRow
                key={video.id}
                id={video.id ?? ""}
                title={video.title ?? ""}
                thumbnailVersion={video.updatedAt}
                views={video.views}
                likes={video.likes}
                comments={video.comments}
                publishedAt={video.publishedAt}
                statusLabel={video.visibility === "public" ? "Public" : (video.visibility ?? video.status ?? "")}
                className="border-b border-border pb-4"
              />
            ))}
          </div>
        )}

        <PaginationLinks window={window} buildHref={(p) => `/studio/videos?page=${p}`} />
      </div>
    </div>
  )
}
