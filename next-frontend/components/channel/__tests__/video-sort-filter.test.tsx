// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { VideoSortFilter } from "../video-sort-filter";

describe("VideoSortFilter", () => {
  it("renders three disabled chips", () => {
    render(<VideoSortFilter />);
    expect(screen.getByRole("button", { name: "Latest" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Popular" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Oldest" })).toBeDisabled();
  });
});
