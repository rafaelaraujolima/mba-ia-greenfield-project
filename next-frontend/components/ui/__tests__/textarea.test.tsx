// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

import { Textarea } from "../textarea";

describe("Textarea", () => {
  it("renders with data-slot=textarea", () => {
    render(<Textarea aria-label="Description" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("data-slot", "textarea");
  });

  it("calls onChange when the user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea aria-label="Description" onChange={onChange} />);
    await user.type(screen.getByRole("textbox"), "hello");
    expect(onChange).toHaveBeenCalled();
  });

  it("supports aria-invalid for error state", () => {
    render(<Textarea aria-label="Description" aria-invalid="true" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});
