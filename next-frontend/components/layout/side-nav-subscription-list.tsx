import * as React from "react"

import { cn } from "@/lib/utils"
import { SubscriptionNavItem } from "@/components/layout/subscription-nav-item"

// Placeholder static list — subscriptions are a future-phase capability; this
// slice has no data source for it. See D6 in the screen inventory.
const PLACEHOLDER_SUBSCRIPTIONS = [
  "Channel One",
  "Channel Two",
  "Channel Three",
  "Channel Four",
  "Channel Five",
  "Channel Six",
]

function SideNavSubscriptionList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="side-nav-subscription-list" className={cn("flex flex-col", className)} {...props}>
      {PLACEHOLDER_SUBSCRIPTIONS.map((name) => (
        <SubscriptionNavItem key={name} name={name} />
      ))}
    </div>
  )
}

export { SideNavSubscriptionList }
