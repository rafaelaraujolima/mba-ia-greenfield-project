"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { SearchIcon } from "@/components/icons/search-icon"
import { CloseIcon } from "@/components/icons/close-icon"

function SearchField({
  className,
  value,
  defaultValue,
  onChange,
  disabled,
  placeholder = "Search",
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (!isControlled) setInternalValue(event.target.value)
    onChange?.(event)
  }

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue("")
      return
    }
    // Controlled usage: synthesize a change event so the parent's state (the
    // source of truth for `value`) is what actually clears the input.
    const syntheticEvent = {
      target: { value: "" },
    } as React.ChangeEvent<HTMLInputElement>
    onChange?.(syntheticEvent)
  }

  return (
    <div
      data-slot="search-field"
      data-disabled={disabled ?? false}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-full)] border border-input bg-transparent px-3 py-1.5",
        "has-[input:disabled]:opacity-50",
        className
      )}
    >
      <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-transparent text-body-md text-foreground outline-none placeholder:text-muted-foreground"
        {...props}
      />
      {currentValue ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={handleClear}
          disabled={disabled}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <CloseIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

export { SearchField }
