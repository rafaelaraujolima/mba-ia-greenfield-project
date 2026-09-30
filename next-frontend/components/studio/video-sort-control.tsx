import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SortIcon } from "@/components/icons/sort-icon"

function VideoSortControl({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "children">) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled
      data-slot="video-sort-control"
      className={cn("text-caption text-muted-foreground", className)}
      {...props}
    >
      <SortIcon />
      Sort by: Latest
    </Button>
  )
}

export { VideoSortControl }
