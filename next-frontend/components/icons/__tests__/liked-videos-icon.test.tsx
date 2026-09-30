// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { LikedVideosIcon } from "../liked-videos-icon";

describe("LikedVideosIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<LikedVideosIcon className="size-4" data-testid="liked" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("size-4");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
