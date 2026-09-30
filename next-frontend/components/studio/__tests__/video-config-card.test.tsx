// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { VideoConfigCard } from "../video-config-card";

describe("VideoConfigCard", () => {
  it("renders the video link and duration", () => {
    render(<VideoConfigCard videoLink="/watch/abc" durationSeconds={65} />);
    expect(screen.getByText("/watch/abc")).toBeInTheDocument();
    expect(screen.getByText("1:05")).toBeInTheDocument();
  });

  it("renders Video Quality when height is provided", () => {
    render(<VideoConfigCard videoLink="/watch/abc" height={1080} />);
    expect(screen.getByText("1080p")).toBeInTheDocument();
  });

  it("omits Video Quality when height is not provided", () => {
    render(<VideoConfigCard videoLink="/watch/abc" height={null} />);
    expect(screen.queryByText(/Video Quality/)).not.toBeInTheDocument();
  });

  it("never renders a Filename field", () => {
    render(<VideoConfigCard videoLink="/watch/abc" />);
    expect(screen.queryByText(/Filename/i)).not.toBeInTheDocument();
  });

  it("calls onCopyLink (defaults to navigator.clipboard.writeText) with the video link when the copy button is clicked", async () => {
    const user = userEvent.setup();
    const onCopyLink = vi.fn();
    render(<VideoConfigCard videoLink="/watch/abc" onCopyLink={onCopyLink} />);
    await user.click(screen.getByRole("button", { name: "Copy video link" }));
    expect(onCopyLink).toHaveBeenCalledWith("/watch/abc");
    expect(screen.getByRole("button", { name: "Copy video link" })).toHaveTextContent("Copied");
  });
});
