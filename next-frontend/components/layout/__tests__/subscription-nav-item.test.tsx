// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SubscriptionNavItem } from "../subscription-nav-item";

describe("SubscriptionNavItem", () => {
  it("renders the channel name and an avatar fallback", () => {
    render(<SubscriptionNavItem name="Channel One" />);
    expect(screen.getByText("Channel One")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });
});
