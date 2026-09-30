// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { VideoStats } from "../video-stats";

describe("VideoStats", () => {
  it("formats counts with Intl.NumberFormat", () => {
    render(<VideoStats views={1500} likes={20} comments={3} />);
    expect(screen.getByText("1.5K")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows 0 when counters are null", () => {
    render(<VideoStats views={null} likes={null} comments={null} />);
    expect(screen.getAllByText("0")).toHaveLength(3);
  });
});
