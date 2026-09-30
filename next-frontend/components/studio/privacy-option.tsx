"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function PrivacyOption({
  className,
  value,
  selected,
  onSelect,
  icon,
  title,
  description,
  ...props
}: Omit<React.ComponentProps<"div">, "onSelect"> & {
  value: string
  selected?: boolean
  onSelect?: (value: string) => void
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
}) {
  const handleSelect = () => onSelect?.(value)

  return (
    <div
      role="radio"
      tabIndex={0}
      aria-checked={selected ?? false}
      data-slot="privacy-option"
      data-selected={selected ?? false}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleSelect()
        }
      }}
      className={cn(
        "flex w-full max-w-xl cursor-pointer items-start gap-3 rounded-[var(--radius-1)] border border-border p-4",
        "outline-none transition-colors",
        "hover:bg-muted/40",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
        "data-[selected=true]:border-primary data-[selected=true]:bg-input-background",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="privacy-option-radio"
        className={cn(
          "relative mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-border",
          "data-[selected=true]:border-primary"
        )}
        data-selected={selected ?? false}
      >
        {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
      </span>
      {icon ? <span className="shrink-0 text-foreground">{icon}</span> : null}
      <span className="flex flex-col gap-1">
        <span className="text-label-lg text-foreground">{title}</span>
        {description ? (
          <span className="text-body-md text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </div>
  )
}

export { PrivacyOption }
