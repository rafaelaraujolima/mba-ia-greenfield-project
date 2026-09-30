// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SortIcon } from "../sort-icon";

describe("SortIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<SortIcon className="size-4" data-testid="sort" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveClass("size-4");
  });
});
