import * as React from "react"

import { cn } from "@/lib/utils"

function Overlay({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="overlay"
      className={cn("fixed inset-0 z-40 bg-overlay", className)}
      {...props}
    />
  )
}

export { Overlay }
