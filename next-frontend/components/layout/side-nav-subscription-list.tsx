import * as React from "react"

import { cn } from "@/lib/utils"
import { SubscriptionNavItem } from "@/components/layout/subscription-nav-item"

export type FollowedChannel = {
  channelId: string
  channelName: string
  channelNickname: string
}

/**
 * Followed channels of the signed-in user, most recent subscription first
 * (social-interactions/TD-07). Renders nothing when there are none.
 */
function SideNavSubscriptionList({
  className,
  subscriptions,
  activePath,
  ...props
}: React.ComponentProps<"div"> & {
  subscriptions: FollowedChannel[]
  activePath?: string | null
}) {
  if (subscriptions.length === 0) return null

  return (
    <div data-slot="side-nav-subscription-list" className={cn("flex flex-col", className)} {...props}>
      {subscriptions.map((channel) => {
        const href = `/channel/${channel.channelNickname}`
        return (
          <SubscriptionNavItem
            key={channel.channelId}
            href={href}
            name={channel.channelName}
            active={activePath === href}
          />
        )
      })}
    </div>
  )
}

export { SideNavSubscriptionList }
