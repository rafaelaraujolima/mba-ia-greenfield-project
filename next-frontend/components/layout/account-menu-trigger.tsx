"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function AccountMenuTrigger({
  className,
  initials,
  open = false,
  ...props
}: Omit<React.ComponentProps<"button">, "type"> & { initials: string; open?: boolean }) {
  return (
    <button
      type="button"
      data-slot="account-menu-trigger"
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(
        "rounded-full outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      <Avatar className="size-9">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    </button>
  )
}

export { AccountMenuTrigger }
