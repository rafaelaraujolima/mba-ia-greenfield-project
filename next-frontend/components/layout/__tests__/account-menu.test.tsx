// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { AccountMenu } from "../account-menu";
import { SessionProvider } from "@/components/auth/session-provider";

const session = {
  userId: "1",
  email: "a@b.com",
  channelSlug: "techmaster",
  isLoggedIn: true,
};

function renderMenu(open: boolean, onClose = vi.fn()) {
  return render(
    <SessionProvider initialSession={session}>
      <AccountMenu open={open} onClose={onClose} />
    </SessionProvider>
  );
}

describe("AccountMenu", () => {
  it("renders nothing when closed", () => {
    renderMenu(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes role=dialog, aria-modal and the accessible name Account", () => {
    renderMenu(true);
    const dialog = screen.getByRole("dialog", { name: "Account" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("shows the channel slug and email from session", () => {
    renderMenu(true);
    expect(screen.getByText("@techmaster")).toBeInTheDocument();
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
  });

  it("renders an Edit Channel item pointing to /studio/channel and no Sign Out item", () => {
    renderMenu(true);
    expect(screen.getByRole("link", { name: /Edit Channel/ })).toHaveAttribute(
      "href",
      "/studio/channel"
    );
    expect(screen.queryByText(/Sign Out/i)).not.toBeInTheDocument();
  });

  it("calls onClose on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderMenu(true, onClose);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking the backdrop", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = renderMenu(true, onClose);
    const overlay = container.querySelector('[data-slot="overlay"]');
    expect(overlay).not.toBeNull();
    await user.click(overlay as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
