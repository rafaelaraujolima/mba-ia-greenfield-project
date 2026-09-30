// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn(() => "/studio/videos") }))
vi.mock("next/navigation", () => ({ usePathname }))

import { AppShell } from "../app-shell"
import { SessionProvider } from "@/components/auth/session-provider"

const session = {
  userId: "1",
  email: "a@b.com",
  channelSlug: "techmaster",
  isLoggedIn: true,
}

function renderShell() {
  return render(
    <SessionProvider initialSession={session}>
      <AppShell>
        <p>Page content</p>
      </AppShell>
    </SessionProvider>
  )
}

describe("AccountMenu wiring (composed via AppShell + SessionProvider)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it("opens the panel with the session's channel slug and email when the avatar is clicked, and fires no network call", async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole("button", { name: "TE" }))

    const dialog = screen.getByRole("dialog", { name: "Account" })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText("@techmaster")).toBeInTheDocument()
    expect(screen.getByText("a@b.com")).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("navigates Edit Channel to /studio/channel", async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole("button", { name: "TE" }))
    const editChannelLink = screen.getByRole("link", { name: /Edit Channel/ })
    expect(editChannelLink).toHaveAttribute("href", "/studio/channel")
  })

  it("returns focus to the avatar trigger after closing the panel", async () => {
    const user = userEvent.setup()
    renderShell()

    const avatarTrigger = screen.getByRole("button", { name: "TE" })
    await user.click(avatarTrigger)
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Close" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(avatarTrigger).toHaveFocus()
  })
})
