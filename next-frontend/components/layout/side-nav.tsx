"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { SideNavItem } from "@/components/layout/side-nav-item"
import {
  SideNavSubscriptionList,
  type FollowedChannel,
} from "@/components/layout/side-nav-subscription-list"
import { HomeIcon } from "@/components/icons/home-icon"
import { SubscriptionsIcon } from "@/components/icons/subscriptions-icon"
import { YourVideosIcon } from "@/components/icons/your-videos-icon"
import { LikedVideosIcon } from "@/components/icons/liked-videos-icon"

const YOUR_VIDEOS_PREFIX = "/studio/videos"
const SUBSCRIPTIONS_PATH = "/subscriptions"

function SideNav({
  className,
  id = "studio-side-nav",
  subscriptions = [],
  ...props
}: React.ComponentProps<"nav"> & { subscriptions?: FollowedChannel[] }) {
  const pathname = usePathname()
  const isYourVideosActive = pathname?.startsWith(YOUR_VIDEOS_PREFIX) ?? false
  const isSubscriptionsActive = pathname === SUBSCRIPTIONS_PATH

  return (
    <nav
      id={id}
      aria-label="Main"
      data-slot="side-nav"
      className={cn("flex w-64 shrink-0 flex-col gap-1 overflow-y-auto p-2", className)}
      {...props}
    >
      <SideNavItem href="#" icon={<HomeIcon />}>
        Home
      </SideNavItem>
      <SideNavItem
        href={SUBSCRIPTIONS_PATH}
        active={isSubscriptionsActive}
        icon={<SubscriptionsIcon />}
      >
        Subscriptions
      </SideNavItem>

      <hr className="my-2 border-border" />

      <span className="px-3.5 py-2 text-h3 text-foreground">You</span>
      <SideNavItem
        href={YOUR_VIDEOS_PREFIX}
        active={isYourVideosActive}
        icon={<YourVideosIcon filled={isYourVideosActive} />}
      >
        Your videos
      </SideNavItem>
      <SideNavItem href="#" icon={<LikedVideosIcon />}>
        Liked videos
      </SideNavItem>

      {subscriptions.length > 0 ? (
        <>
          <hr className="my-2 border-border" />

          <span className="px-3.5 py-2 text-h3 text-foreground">Subscriptions</span>
          <SideNavSubscriptionList subscriptions={subscriptions} activePath={pathname} />
        </>
      ) : null}
    </nav>
  )
}

export { SideNav }
