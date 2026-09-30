// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { PlusIcon } from "../plus-icon";

describe("PlusIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<PlusIcon className="size-4" data-testid="plus" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveClass("size-4");
  });
});
