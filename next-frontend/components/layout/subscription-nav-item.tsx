import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function SubscriptionNavItem({
  className,
  name,
  active = false,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "children"> & {
  name: string
  active?: boolean
}) {
  return (
    <Link
      data-slot="subscription-nav-item"
      data-active={active}
      aria-current={active ? "page" : undefined}
      title={name}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-3)] px-3.5 py-2 no-underline",
        "outline-none transition-colors hover:bg-muted",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-[active=true]:bg-card",
        className
      )}
      {...props}
    >
      <Avatar size="sm">
        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate text-body-lg text-foreground">{name}</span>
    </Link>
  )
}

export { SubscriptionNavItem }
