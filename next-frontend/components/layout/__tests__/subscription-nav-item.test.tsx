// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SubscriptionNavItem } from "../subscription-nav-item";

describe("SubscriptionNavItem", () => {
  it("renders a link with the channel name, avatar fallback and a title for truncation", () => {
    render(<SubscriptionNavItem href="/channel/channel-one" name="Channel One" />);

    const link = screen.getByRole("link", { name: /Channel One/ });
    expect(link).toHaveAttribute("href", "/channel/channel-one");
    expect(link).toHaveAttribute("title", "Channel One");
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("exposes aria-current when active", () => {
    render(<SubscriptionNavItem href="/channel/x" name="X Channel" active />);

    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });
});
