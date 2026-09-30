import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

function SideNavItem({
  className,
  active = false,
  icon,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { active?: boolean; icon?: React.ReactNode }) {
  return (
    <Link
      data-slot="side-nav-item"
      data-active={active}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[46px] items-center gap-3 rounded-[var(--radius-3)] px-3.5",
        "text-body-lg text-foreground no-underline",
        "outline-none transition-colors hover:bg-muted",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-[active=true]:bg-card data-[active=true]:font-weight-600",
        "[&_svg]:size-5 [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </Link>
  )
}

export { SideNavItem }
