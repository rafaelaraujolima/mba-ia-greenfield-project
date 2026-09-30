// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SectionHeader } from "../section-header";

describe("SectionHeader", () => {
  it("renders the title with the given id", () => {
    render(<SectionHeader id="category-heading" title="Category" />);
    const heading = screen.getByRole("heading", { name: "Category" });
    expect(heading).toHaveAttribute("id", "category-heading");
  });

  it("renders the optional description", () => {
    render(<SectionHeader title="Thumbnail" description="Upload a custom thumbnail" />);
    expect(screen.getByText("Upload a custom thumbnail")).toBeInTheDocument();
  });

  it("omits the description paragraph when not provided", () => {
    render(<SectionHeader title="Visibility" />);
    expect(screen.queryByText("Upload a custom thumbnail")).not.toBeInTheDocument();
  });
});
