// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SubscriptionsIcon } from "../subscriptions-icon";

describe("SubscriptionsIcon", () => {
  it("renders an svg and forwards className/props", () => {
    const { container } = render(<SubscriptionsIcon className="size-4" data-testid="subs" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveClass("size-4");
  });
});
