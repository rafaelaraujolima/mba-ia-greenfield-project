// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

import { Overlay } from "../overlay";

describe("Overlay", () => {
  it("renders with data-slot=overlay", () => {
    render(<Overlay data-testid="overlay" />);
    expect(screen.getByTestId("overlay")).toHaveAttribute("data-slot", "overlay");
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Overlay data-testid="overlay" onClick={onClick} />);
    await user.click(screen.getByTestId("overlay"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
