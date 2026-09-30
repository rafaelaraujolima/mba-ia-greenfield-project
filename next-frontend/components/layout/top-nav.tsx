"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/auth/brand-logo"
import { IconButton } from "@/components/ui/icon-button"
import { SearchField } from "@/components/ui/search-field"
import { MenuIcon } from "@/components/icons/menu-icon"
import { MicIcon } from "@/components/icons/mic-icon"
import { PlusIcon } from "@/components/icons/plus-icon"
import { AccountMenuTrigger } from "@/components/layout/account-menu-trigger"

function TopNav({
  className,
  menuExpanded,
  onMenuToggle,
  accountMenuOpen,
  onAccountMenuToggle,
  accountInitials,
  ...props
}: React.ComponentProps<"header"> & {
  menuExpanded: boolean
  onMenuToggle: () => void
  accountMenuOpen: boolean
  onAccountMenuToggle: () => void
  accountInitials: string
}) {
  return (
    <header
      data-slot="top-nav"
      className={cn(
        "flex h-[62px] w-full min-w-80 items-center gap-4 border-b border-border bg-background px-4",
        className
      )}
      {...props}
    >
      <IconButton
        variant="ghost"
        aria-label="Toggle menu"
        aria-expanded={menuExpanded}
        aria-controls="studio-side-nav"
        onClick={onMenuToggle}
      >
        <MenuIcon />
      </IconButton>

      <Link href="/" className="shrink-0">
        <BrandLogo size="md" />
      </Link>

      <div className="ml-auto flex flex-1 items-center justify-end gap-2 sm:justify-center">
        {/* Global search — inerte nesta slice (D6): sem capability nem handler. */}
        <SearchField aria-label="Search" disabled className="hidden max-w-md sm:flex" />
        <IconButton variant="ghost" aria-label="Search by voice" disabled>
          <MicIcon />
        </IconButton>
      </div>

      <div className="ml-auto flex items-center gap-3 sm:ml-0">
        {/* Create — destino fora do escopo desta slice (fluxo de upload). */}
        <IconButton variant="ghost" aria-label="Create" disabled>
          <PlusIcon />
        </IconButton>
        <AccountMenuTrigger
          initials={accountInitials}
          open={accountMenuOpen}
          onClick={onAccountMenuToggle}
        />
      </div>
    </header>
  )
}

export { TopNav }
