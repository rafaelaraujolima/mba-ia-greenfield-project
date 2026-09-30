// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { MenuIcon } from "../menu-icon";

describe("MenuIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<MenuIcon className="size-4" data-testid="menu" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveClass("size-4");
  });
});
