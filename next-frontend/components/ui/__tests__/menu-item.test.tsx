// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { MenuItem } from "../menu-item";

describe("MenuItem", () => {
  it("renders a link with data-slot=menu-item and the given href", () => {
    render(<MenuItem href="/studio/channel">Edit Channel</MenuItem>);
    const link = screen.getByRole("link", { name: "Edit Channel" });
    expect(link).toHaveAttribute("data-slot", "menu-item");
    expect(link).toHaveAttribute("href", "/studio/channel");
  });

  it("renders the given icon alongside the label", () => {
    render(
      <MenuItem href="/studio/channel" icon={<svg data-testid="icon" />}>
        Edit Channel
      </MenuItem>
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
