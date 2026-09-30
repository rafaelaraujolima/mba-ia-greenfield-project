// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { VideoEditForm } from "../video-edit-form";

const categories = [
  { id: "cat-1", name: "Tech" },
  { id: "cat-2", name: "Music" },
];

function makeVideo(overrides: Partial<Parameters<typeof VideoEditForm>[0]["video"]> = {}) {
  return {
    id: "abc",
    title: "My video",
    description: "A description",
    categoryId: "cat-1",
    visibility: "public" as const,
    status: "ready" as const,
    publishedAt: null,
    videoLink: "/watch/abc",
    durationSeconds: 65,
    height: 1080,
    ...overrides,
  };
}

describe("VideoEditForm", () => {
  it("pre-fills fields with the video's initial values", () => {
    render(
      <VideoEditForm video={makeVideo()} categories={categories} onSave={vi.fn()} />
    );
    expect(screen.getByLabelText("Title")).toHaveValue("My video");
    expect(screen.getByLabelText("Description")).toHaveValue("A description");
  });

  it("exposes a radiogroup for visibility and an accessible Category select", () => {
    render(
      <VideoEditForm video={makeVideo()} categories={categories} onSave={vi.fn()} />
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument();
  });

  it("submits edited title/description and current categoryId/visibility", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <VideoEditForm video={makeVideo()} categories={categories} onSave={onSave} />
    );

    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "New title");
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New title",
        categoryId: "cat-1",
        visibility: "public",
        thumbnailFile: null,
      })
    );
  });

  it("selecting Unlisted updates the visibility field via role=radio", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <VideoEditForm video={makeVideo()} categories={categories} onSave={onSave} />
    );

    await user.click(screen.getByRole("radio", { name: /Unlisted/ }));
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ visibility: "unlisted" }));
  });

  it("disables Publish when status is processing", () => {
    render(
      <VideoEditForm
        video={makeVideo({ status: "processing" })}
        categories={categories}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Publish/ })).toBeDisabled();
  });

  it("enables Publish when status is ready and unpublished", () => {
    render(
      <VideoEditForm
        video={makeVideo({ status: "ready", publishedAt: null })}
        categories={categories}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Publish/ })).toBeEnabled();
  });

  it("disables Publish when the video is already published", () => {
    render(
      <VideoEditForm
        video={makeVideo({ status: "ready", publishedAt: "2026-01-01T00:00:00.000Z" })}
        categories={categories}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Publish/ })).toBeDisabled();
  });
});
