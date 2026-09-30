// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

import { FilterChip } from "../filter-chip";

describe("FilterChip", () => {
  it("renders with data-slot=filter-chip and normal state by default", () => {
    render(<FilterChip>Latest</FilterChip>);
    const el = screen.getByRole("button", { name: "Latest" });
    expect(el).toHaveAttribute("data-slot", "filter-chip");
    expect(el).toHaveAttribute("data-active", "false");
    expect(el).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects the active variant", () => {
    render(<FilterChip active>Popular</FilterChip>);
    const el = screen.getByRole("button", { name: "Popular" });
    expect(el).toHaveAttribute("data-active", "true");
    expect(el).toHaveAttribute("aria-pressed", "true");
  });

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <FilterChip disabled onClick={onClick}>
        Oldest
      </FilterChip>
    );
    const el = screen.getByRole("button", { name: "Oldest" });
    expect(el).toBeDisabled();
    await user.click(el);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("fires onClick when enabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<FilterChip onClick={onClick}>Latest</FilterChip>);
    await user.click(screen.getByRole("button", { name: "Latest" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
