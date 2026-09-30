import * as React from "react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

function ChannelSummary({
  className,
  name,
  handle,
  ...props
}: React.ComponentProps<"div"> & {
  name: string
  handle: string
}) {
  return (
    <Card
      data-slot="channel-summary"
      className={cn("flex flex-col gap-1 p-4", className)}
      {...props}
    >
      <span className="text-label-lg text-foreground">{name}</span>
      <span className="text-body-md text-muted-foreground">{handle}</span>
    </Card>
  )
}

export { ChannelSummary }
