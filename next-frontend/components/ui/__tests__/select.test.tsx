// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../select";

function renderSelect(onValueChange = vi.fn()) {
  return render(
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Category">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="tech">Science &amp; Technology</SelectItem>
        <SelectItem value="music">Music</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("renders a trigger with data-slot=select-trigger and the placeholder", () => {
    renderSelect();
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("data-slot", "select-trigger");
    expect(screen.getByText("Select a category")).toBeInTheDocument();
  });

  it("has an accessible name via aria-label", () => {
    renderSelect();
    expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument();
  });

  it("opens the listbox and selects an item, calling onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderSelect(onValueChange);
    await user.click(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "Music" });
    await user.click(option);
    expect(onValueChange).toHaveBeenCalledWith("music");
  });
});
