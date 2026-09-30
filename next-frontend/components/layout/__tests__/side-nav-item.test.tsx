// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SideNavItem } from "../side-nav-item";

describe("SideNavItem", () => {
  it("renders a link with the given href", () => {
    render(<SideNavItem href="/studio/videos">Your videos</SideNavItem>);
    expect(screen.getByRole("link", { name: "Your videos" })).toHaveAttribute(
      "href",
      "/studio/videos"
    );
  });

  it("exposes aria-current=page when active", () => {
    render(
      <SideNavItem href="/studio/videos" active>
        Your videos
      </SideNavItem>
    );
    expect(screen.getByRole("link", { name: "Your videos" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("does not expose aria-current when inactive", () => {
    render(<SideNavItem href="/studio/videos">Your videos</SideNavItem>);
    expect(screen.getByRole("link", { name: "Your videos" })).not.toHaveAttribute(
      "aria-current"
    );
  });
});
