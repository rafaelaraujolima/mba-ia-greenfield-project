// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { EditIcon } from "../edit-icon";

describe("EditIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<EditIcon className="size-4" data-testid="edit" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("size-4");
    expect(svg).toHaveAttribute("data-testid", "edit");
  });
});
