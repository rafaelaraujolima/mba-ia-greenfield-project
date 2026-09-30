// @vitest-environment jsdom
import type * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

import { TopNav } from "../top-nav";

function renderTopNav(overrides: Partial<React.ComponentProps<typeof TopNav>> = {}) {
  return render(
    <TopNav
      menuExpanded
      onMenuToggle={vi.fn()}
      accountMenuOpen={false}
      onAccountMenuToggle={vi.fn()}
      accountInitials="RL"
      {...overrides}
    />
  );
}

describe("TopNav", () => {
  it("renders icon-only controls with accessible names", () => {
    renderTopNav();
    expect(screen.getByRole("button", { name: "Toggle menu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search by voice" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("renders the search field disabled (inert per D6)", () => {
    renderTopNav();
    expect(screen.getByRole("searchbox", { name: "Search" })).toBeDisabled();
  });

  it("calls onMenuToggle when the hamburger is clicked", async () => {
    const user = userEvent.setup();
    const onMenuToggle = vi.fn();
    renderTopNav({ onMenuToggle });
    await user.click(screen.getByRole("button", { name: "Toggle menu" }));
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onAccountMenuToggle when the avatar is clicked", async () => {
    const user = userEvent.setup();
    const onAccountMenuToggle = vi.fn();
    renderTopNav({ onAccountMenuToggle });
    await user.click(screen.getByRole("button", { name: "RL" }));
    expect(onAccountMenuToggle).toHaveBeenCalledTimes(1);
  });
});
