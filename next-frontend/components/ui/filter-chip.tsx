import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const filterChipVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center",
    "rounded-[var(--radius-2)] bg-card",
    "px-3 py-2 text-body-lg text-foreground",
    "whitespace-nowrap select-none transition-all outline-none",
    "hover:bg-muted/40",
    "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      active: {
        true: "border-transparent bg-primary text-primary-foreground hover:bg-primary hover:opacity-90",
        false: "",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
)

function FilterChip({
  className,
  active = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof filterChipVariants>) {
  return (
    <button
      type="button"
      data-slot="filter-chip"
      data-active={active}
      aria-pressed={active ?? false}
      className={cn(filterChipVariants({ active, className }))}
      {...props}
    />
  )
}

export { FilterChip, filterChipVariants }
