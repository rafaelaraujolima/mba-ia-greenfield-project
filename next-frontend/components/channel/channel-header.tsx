import * as React from "react"

import { cn } from "@/lib/utils"
import { formatCompactCount } from "@/lib/format-count"

function ChannelHeader({
  className,
  name,
  nickname,
  description,
  subscriberCount,
  action,
  ...props
}: React.ComponentProps<"div"> & {
  name: string
  nickname: string
  description?: string | null
  /** Shown in the meta line as "N subscribers" (compact notation). */
  subscriberCount?: number
  /** Slot for the SubscribeButton, beside the channel name. */
  action?: React.ReactNode
}) {
  return (
    <div
      data-slot="channel-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-h1 text-foreground">{name}</h1>
        {action}
      </div>
      <div className="flex items-center gap-2 text-body-lg text-muted-foreground">
        <span>{nickname}</span>
        {subscriberCount !== undefined ? (
          <>
            <span aria-hidden="true">•</span>
            <span aria-live="polite" data-slot="subscriber-count">
              {formatCompactCount(subscriberCount)} subscribers
            </span>
          </>
        ) : null}
      </div>
      {description ? (
        <p className="text-body-md text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export { ChannelHeader }
