import type * as React from "react"

import { cn } from "@/lib/utils"
import { formatCompactCount } from "@/lib/format-count"

function ChannelInfo({
  className,
  channelName,
  channelNickname,
  subscriberCount,
  action,
}: {
  className?: string
  channelName: string
  channelNickname?: string | null
  /** Compact subscriber count, shown next to the nickname when provided. */
  subscriberCount?: number
  /** Slot for the SubscribeButton. */
  action?: React.ReactNode
}) {
  return (
    <div data-slot="channel-info" className={cn("flex items-center gap-4", className)}>
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="size-10 shrink-0 rounded-[var(--radius-full)] border border-border bg-muted"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-label-lg text-foreground">{channelName}</span>
          {channelNickname ? (
            <span className="text-caption text-muted-foreground">@{channelNickname}</span>
          ) : null}
          {subscriberCount !== undefined ? (
            <span
              aria-live="polite"
              data-slot="subscriber-count"
              className="text-caption text-muted-foreground"
            >
              {formatCompactCount(subscriberCount)} subscribers
            </span>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  )
}

export { ChannelInfo }
