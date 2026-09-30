// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SearchIcon } from "../search-icon";

describe("SearchIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<SearchIcon className="size-4" data-testid="search" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveClass("size-4");
  });
});
