"use client"

import { cn } from "@/lib/utils"

function TabMenu({
  className,
  options,
  value,
  onValueChange,
}: {
  className?: string
  options: string[]
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <div
      data-slot="tab-menu"
      role="tablist"
      className={cn("flex items-center gap-2 overflow-x-auto py-3.5", className)}
    >
      {options.map((option) => {
        const isActive = option === value
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onValueChange(option)}
            className={cn(
              "flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-2)] px-3 py-2 text-body-md whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive
                ? "bg-foreground text-background"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

export { TabMenu }
