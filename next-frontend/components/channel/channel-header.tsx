import * as React from "react"

import { cn } from "@/lib/utils"

function ChannelHeader({
  className,
  name,
  nickname,
  description,
  ...props
}: React.ComponentProps<"div"> & {
  name: string
  nickname: string
  description?: string | null
}) {
  return (
    <div
      data-slot="channel-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      <h1 className="text-h1 text-foreground">{name}</h1>
      <span className="text-body-lg text-muted-foreground">{nickname}</span>
      {description ? (
        <p className="text-body-md text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export { ChannelHeader }
