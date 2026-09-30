// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { YourVideosIcon } from "../your-videos-icon";

describe("YourVideosIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<YourVideosIcon className="size-4" data-testid="your-videos" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveClass("size-4");
  });

  it("renders the outline variant by default", () => {
    const { container } = render(<YourVideosIcon />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", "none");
  });

  it("renders the filled variant when filled is true", () => {
    const { container } = render(<YourVideosIcon filled />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", "currentColor");
  });
});
