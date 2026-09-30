// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { CloseIcon } from "../close-icon";

describe("CloseIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<CloseIcon className="size-4" data-testid="close" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("size-4");
    expect(svg).toHaveAttribute("data-testid", "close");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
