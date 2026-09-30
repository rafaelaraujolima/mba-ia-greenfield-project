import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

function MenuItem({
  className,
  href,
  icon,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { icon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-slot="menu-item"
      className={cn(
        "flex items-center gap-4 border-b border-border px-4 py-4",
        "text-body-lg text-foreground no-underline",
        "outline-none transition-colors hover:bg-muted",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </Link>
  )
}

export { MenuItem }
