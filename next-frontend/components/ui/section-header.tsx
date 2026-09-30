import * as React from "react"

import { cn } from "@/lib/utils"

function SectionHeader({
  className,
  id,
  title,
  description,
  ...props
}: React.ComponentProps<"div"> & {
  id?: string
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div data-slot="section-header" className={cn("flex flex-col gap-1", className)} {...props}>
      <h2 id={id} className="text-label-xl font-weight-600 text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="text-body-md text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export { SectionHeader }
