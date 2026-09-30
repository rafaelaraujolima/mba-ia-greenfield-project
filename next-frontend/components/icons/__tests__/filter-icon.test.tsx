// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { FilterIcon } from "../filter-icon";

describe("FilterIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<FilterIcon className="size-4" data-testid="filter" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("size-4");
    expect(svg).toHaveAttribute("data-testid", "filter");
  });
});
