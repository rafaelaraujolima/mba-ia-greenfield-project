// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { VideoCard } from "../video-card";

describe("VideoCard", () => {
  it("renders a single link to the watch page", () => {
    render(<VideoCard id="abc" title="My video" views={1500} publishedAt="2026-01-01T00:00:00.000Z" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/watch/abc");
  });

  it("formats views and relative time", () => {
    render(<VideoCard id="abc" title="My video" views={1500} publishedAt="2026-01-01T00:00:00.000Z" />);
    expect(screen.getByText(/1\.5K views/)).toBeInTheDocument();
  });
});
