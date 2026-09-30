// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { VideoListRow } from "../video-list-row";

describe("VideoListRow", () => {
  it("links to the edit page for the video id", () => {
    render(
      <VideoListRow id="abc" title="My video" statusLabel="Public" publishedAt="2026-01-01T00:00:00.000Z" />
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/studio/videos/abc/edit");
  });

  it("does not show a publish time for drafts (publishedAt null)", () => {
    render(<VideoListRow id="abc" title="Draft video" statusLabel="Draft" publishedAt={null} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.queryByText(/ago|in \d/)).not.toBeInTheDocument();
  });

  it("renders a status/visibility badge", () => {
    render(<VideoListRow id="abc" title="My video" statusLabel="Processing" publishedAt={null} />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });
});
