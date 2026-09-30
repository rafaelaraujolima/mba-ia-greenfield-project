// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import { SearchField } from "../search-field";

describe("SearchField", () => {
  it("renders with data-slot=search-field and an accessible label", () => {
    render(<SearchField aria-label="Search videos" />);
    const input = screen.getByRole("searchbox", { name: "Search videos" });
    expect(input.closest("[data-slot=search-field]")).toBeInTheDocument();
  });

  it("does not accept typing and exposes disabled when disabled", async () => {
    const user = userEvent.setup();
    render(<SearchField aria-label="Search videos" disabled />);
    const input = screen.getByRole("searchbox", { name: "Search videos" });
    expect(input).toBeDisabled();
    await user.type(input, "abc");
    expect(input).toHaveValue("");
  });

  it("clears the value when the clear button is clicked", async () => {
    const user = userEvent.setup();
    render(<SearchField aria-label="Search videos" />);
    const input = screen.getByRole("searchbox", { name: "Search videos" });
    await user.type(input, "hello");
    expect(input).toHaveValue("hello");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
  });
});
