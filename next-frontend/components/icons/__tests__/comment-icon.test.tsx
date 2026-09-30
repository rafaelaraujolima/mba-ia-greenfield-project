// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { CommentIcon } from "../comment-icon";

describe("CommentIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<CommentIcon className="size-4" data-testid="comment" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("size-4");
    expect(svg).toHaveAttribute("data-testid", "comment");
  });
});
