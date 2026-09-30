// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { ThumbsUpIcon } from "../thumbs-up-icon";

describe("ThumbsUpIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<ThumbsUpIcon className="size-4" data-testid="thumbs-up" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveClass("size-4");
  });
});
