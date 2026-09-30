"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useSession } from "@/hooks/use-session"
import { TopNav } from "@/components/layout/top-nav"
import { SideNav } from "@/components/layout/side-nav"
import { AccountMenu } from "@/components/layout/account-menu"

function initialsFromSlug(slug: string): string {
  return slug.slice(0, 2).toUpperCase()
}

function AppShell({ className, children, ...props }: React.ComponentProps<"div">) {
  const { channelSlug } = useSession()
  const [sideNavVisible, setSideNavVisible] = React.useState(true)
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false)

  return (
    <div data-slot="app-shell" className={cn("flex h-screen flex-col", className)} {...props}>
      <TopNav
        menuExpanded={sideNavVisible}
        onMenuToggle={() => setSideNavVisible((visible) => !visible)}
        accountMenuOpen={accountMenuOpen}
        onAccountMenuToggle={() => setAccountMenuOpen((open) => !open)}
        accountInitials={initialsFromSlug(channelSlug)}
      />
      <div className="flex flex-1 overflow-hidden">
        {sideNavVisible ? <SideNav /> : null}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <AccountMenu open={accountMenuOpen} onClose={() => setAccountMenuOpen(false)} />
    </div>
  )
}

export { AppShell }
