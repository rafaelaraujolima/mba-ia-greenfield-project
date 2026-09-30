// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { MicIcon } from "../mic-icon";

describe("MicIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<MicIcon className="size-4" data-testid="mic" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveClass("size-4");
  });
});
