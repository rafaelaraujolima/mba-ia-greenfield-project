// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn(() => "/") }));
vi.mock("next/navigation", () => ({ usePathname }));

import { AppShell } from "../app-shell";
import { SessionProvider } from "@/components/auth/session-provider";

const session = {
  userId: "1",
  email: "a@b.com",
  channelSlug: "techmaster",
  isLoggedIn: true,
};

function renderShell() {
  return render(
    <SessionProvider initialSession={session}>
      <AppShell>
        <p>Page content</p>
      </AppShell>
    </SessionProvider>
  );
}

describe("AppShell", () => {
  it("renders TopNav, SideNav and children", () => {
    renderShell();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle menu" })).toBeInTheDocument();
  });

  it("toggles the SideNav visibility via the hamburger button", async () => {
    const user = userEvent.setup();
    renderShell();
    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("opens the AccountMenu when the avatar is clicked", async () => {
    const user = userEvent.setup();
    renderShell();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "TE" }));
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
  });
});
