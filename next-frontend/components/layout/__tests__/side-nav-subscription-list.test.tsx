// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SideNavSubscriptionList } from "../side-nav-subscription-list";

describe("SideNavSubscriptionList", () => {
  it("renders 6 static placeholder items", () => {
    render(<SideNavSubscriptionList />);
    expect(screen.getByText("Channel One")).toBeInTheDocument();
    expect(screen.getByText("Channel Six")).toBeInTheDocument();
  });
});
