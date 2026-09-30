// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { HomeIcon } from "../home-icon";

describe("HomeIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<HomeIcon className="size-4" data-testid="home" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("size-4");
  });

  it("renders the outline variant by default (fill=none)", () => {
    const { container } = render(<HomeIcon data-testid="home" />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", "none");
    expect(container.querySelector("svg")).toHaveAttribute("data-filled", "false");
  });

  it("renders the filled variant when filled is true", () => {
    const { container } = render(<HomeIcon filled data-testid="home" />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", "currentColor");
    expect(container.querySelector("svg")).toHaveAttribute("data-filled", "true");
  });
});
