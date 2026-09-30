"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useSession } from "@/hooks/use-session"
import { Overlay } from "@/components/ui/overlay"
import { MenuItem } from "@/components/ui/menu-item"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { IconButton } from "@/components/ui/icon-button"
import { CloseIcon } from "@/components/icons/close-icon"
import { EditIcon } from "@/components/icons/edit-icon"

function initialsFromSlug(slug: string): string {
  return slug.slice(0, 2).toUpperCase()
}

function AccountMenu({
  className,
  open,
  onClose,
  ...props
}: React.ComponentProps<"div"> & {
  open: boolean
  onClose: () => void
}) {
  const { channelSlug, email } = useSession()
  const panelRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<Element | null>(null)

  React.useEffect(() => {
    if (!open) return

    triggerRef.current = document.activeElement
    panelRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
        return
      }

      if (event.key !== "Tab" || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
      }
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <Overlay onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Account"
        tabIndex={-1}
        data-slot="account-menu"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-full w-80 flex-col bg-card shadow-drawer-left",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between p-4">
          <span className="text-h3 text-foreground">Account</span>
          <IconButton aria-label="Close" size="lg" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        <div className="flex flex-row items-center gap-4 px-4 py-4">
          <Avatar className="size-16">
            <AvatarFallback>{initialsFromSlug(channelSlug)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-body-lg text-foreground">@{channelSlug}</span>
            <span className="text-body-md text-muted-foreground">{email}</span>
          </div>
        </div>

        <MenuItem href="/studio/channel" icon={<EditIcon />}>
          Edit Channel
        </MenuItem>
      </div>
    </>
  )
}

export { AccountMenu }
