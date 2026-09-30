// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { VideoThumbnail } from "../video-thumbnail";

describe("VideoThumbnail", () => {
  it("renders an image whose src references the BFF thumbnail route with the version param", () => {
    const { container } = render(
      <VideoThumbnail videoId="abc" version="2026-01-01T00:00:00.000Z" alt="" />
    );
    // alt="" is intentional (decorative image inside a link with visible text elsewhere),
    // which removes the implicit img role — query the element directly instead of by role.
    const img = container.querySelector("img");
    const src = img?.getAttribute("src") ?? "";
    // The component renders `unoptimized` (next/image does not rewrite src through
    // /_next/image?url=... in that mode — see video-thumbnail.tsx's comment on why:
    // the BFF thumbnail route 302-redirects, which next/image's internal-fetch
    // optimization path can't follow, so the browser must request the path natively).
    expect(src).toBe("/api/videos/abc/thumbnail?v=2026-01-01T00%3A00%3A00.000Z");
  });

  it("formats and displays the duration overlay when durationSeconds is provided", () => {
    render(<VideoThumbnail videoId="abc" durationSeconds={630} alt="" />);
    expect(screen.getByText("10:30")).toBeInTheDocument();
  });

  it("renders the placeholder instead of an image when there is no videoId", () => {
    render(<VideoThumbnail alt="" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("omits the duration overlay when durationSeconds is not provided", () => {
    render(<VideoThumbnail videoId="abc" alt="" />);
    expect(screen.queryByText(/^\d+:\d{2}$/)).not.toBeInTheDocument();
  });
});
