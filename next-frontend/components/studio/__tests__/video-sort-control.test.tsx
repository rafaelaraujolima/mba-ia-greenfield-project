// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { VideoSortControl } from "../video-sort-control";

describe("VideoSortControl", () => {
  it("renders disabled", () => {
    render(<VideoSortControl />);
    expect(screen.getByRole("button", { name: /Sort by: Latest/ })).toBeDisabled();
  });
});
