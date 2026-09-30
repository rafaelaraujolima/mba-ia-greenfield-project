import * as React from "react"

import { cn } from "@/lib/utils"
import { FilterChip } from "@/components/ui/filter-chip"

function VideoSortFilter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="video-sort-filter"
      className={cn("flex items-center gap-4", className)}
      {...props}
    >
      <FilterChip disabled>Latest</FilterChip>
      <FilterChip disabled>Popular</FilterChip>
      <FilterChip disabled>Oldest</FilterChip>
    </div>
  )
}

export { VideoSortFilter }
