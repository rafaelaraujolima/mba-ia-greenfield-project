// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Badge } from "../badge";

describe("Badge", () => {
  it("renders with data-slot=badge and default variant", () => {
    render(<Badge>Public</Badge>);
    const el = screen.getByText("Public");
    expect(el).toHaveAttribute("data-slot", "badge");
    expect(el).toHaveAttribute("data-variant", "default");
  });

  it("reflects a non-default variant via data-variant", () => {
    render(<Badge variant="secondary">Unlisted</Badge>);
    expect(screen.getByText("Unlisted")).toHaveAttribute("data-variant", "secondary");
  });

  it("merges a custom className without dropping base classes", () => {
    render(<Badge className="mt-4">Draft</Badge>);
    expect(screen.getByText("Draft").className).toContain("mt-4");
  });
});
