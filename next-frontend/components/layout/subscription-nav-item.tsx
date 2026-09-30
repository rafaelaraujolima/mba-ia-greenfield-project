import * as React from "react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function SubscriptionNavItem({
  className,
  name,
  ...props
}: React.ComponentProps<"div"> & { name: string }) {
  return (
    <div
      data-slot="subscription-nav-item"
      className={cn("flex items-center gap-3 rounded-[var(--radius-3)] px-3.5 py-2", className)}
      {...props}
    >
      <Avatar size="sm">
        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate text-body-lg text-foreground">{name}</span>
    </div>
  )
}

export { SubscriptionNavItem }
