// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { ViewsIcon } from "../views-icon";
import { EyeIcon } from "../eye-icon";

describe("ViewsIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<ViewsIcon className="size-4" data-testid="views" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveClass("size-4");
  });

  it("is a distinct component from EyeIcon (password visibility)", () => {
    expect(ViewsIcon).not.toBe(EyeIcon);
  });
});
