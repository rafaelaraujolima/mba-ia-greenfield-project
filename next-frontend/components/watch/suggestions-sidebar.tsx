"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { VideoCard } from "@/components/channel/video-card"
import { TabMenu } from "@/components/watch/tab-menu"
import type { VideoSuggestions } from "@/lib/api/contracts"

type SuggestionItem = NonNullable<VideoSuggestions["items"]>[number]

const ALL_OPTION = "All"

function SuggestionsSidebar({
  className,
  videos,
}: {
  className?: string
  videos: SuggestionItem[]
}) {
  const channelOptions = React.useMemo(() => {
    const names = new Set<string>()
    for (const video of videos) {
      if (video.channelName) names.add(video.channelName)
    }
    return [ALL_OPTION, ...names]
  }, [videos])

  const [filter, setFilter] = React.useState(ALL_OPTION)

  const filteredVideos =
    filter === ALL_OPTION ? videos : videos.filter((video) => video.channelName === filter)

  return (
    <div data-slot="suggestions-sidebar" className={cn("flex w-full flex-col gap-2.5", className)}>
      <TabMenu options={channelOptions} value={filter} onValueChange={setFilter} />

      <div className="flex flex-col gap-4">
        {filteredVideos.map((video) => (
          <VideoCard
            key={video.id}
            id={video.id ?? ""}
            title={video.title ?? ""}
            channelName={video.channelName}
            views={video.viewCount}
            publishedAt={video.publishedAt}
            layout="list"
          />
        ))}
      </div>
    </div>
  )
}

export { SuggestionsSidebar }
