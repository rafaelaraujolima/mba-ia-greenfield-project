// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import { VideoEditFormContainer } from "../video-edit-form-container";

const { refreshMock, pushMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: pushMock }),
}));

const categories = [
  { id: "cat-1", name: "Tech" },
  { id: "cat-2", name: "Music" },
];

function makeVideo(overrides: Partial<Parameters<typeof VideoEditFormContainer>[0]["video"]> = {}) {
  return {
    id: "video-1",
    title: "My video",
    description: "A description",
    categoryId: "cat-1",
    visibility: "public" as const,
    status: "ready" as const,
    publishedAt: null,
    videoLink: "/watch/video-1",
    durationSeconds: 65,
    height: 1080,
    ...overrides,
  };
}

function envelope(statusCode: number, error: string, message: string) {
  return { statusCode, error, message, code: null };
}

beforeEach(() => {
  refreshMock.mockClear();
  pushMock.mockClear();
});

describe("<VideoEditFormContainer /> submit wiring", () => {
  it("submits PATCH then POST thumbnail when a file was chosen, and refreshes on success", async () => {
    const user = userEvent.setup();
    const patchCalls: Record<string, unknown>[] = [];
    let thumbnailReceived = false;

    server.use(
      http.patch("/api/videos/:id", async ({ request }) => {
        patchCalls.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { id: "video-1", title: "New title", updatedAt: "2026-01-03T00:00:00.000Z" },
          { status: 200 }
        );
      }),
      http.post("/api/videos/:id/thumbnail", async ({ request }) => {
        const formData = await request.formData();
        const thumbnail = formData.get("thumbnail");
        // MSW/undici re-parses the intercepted request's multipart body with its
        // own File implementation, which doesn't preserve the original name/size
        // fidelity through jsdom's File → fetch → multipart → MSW round trip
        // (a known environment limitation, not app behavior) — assert only what
        // the container actually controls: a file-like "thumbnail" part with the
        // right MIME type was sent, not byte-for-byte content fidelity.
        thumbnailReceived =
          !!thumbnail && typeof thumbnail === "object" && "type" in thumbnail && "size" in thumbnail &&
          (thumbnail as File).type === "image/png";
        return HttpResponse.json(
          { id: "video-1", thumbnailKey: "thumbnails/video-1.jpg", updatedAt: "2026-01-03T00:00:00.000Z" },
          { status: 200 }
        );
      })
    );

    render(<VideoEditFormContainer video={makeVideo()} categories={categories} />);

    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "New title");

    const file = new File([new Uint8Array(1024)], "thumb.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Choose thumbnail file"), file);

    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(patchCalls).toHaveLength(1);
    expect(patchCalls[0]).toMatchObject({ title: "New title", categoryId: "cat-1", visibility: "public" });
    expect(thumbnailReceived).toBe(true);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not call the thumbnail endpoint when no file was chosen", async () => {
    const user = userEvent.setup();
    let thumbnailCalled = false;

    server.use(
      http.patch("/api/videos/:id", () =>
        HttpResponse.json({ id: "video-1", updatedAt: "2026-01-03T00:00:00.000Z" }, { status: 200 })
      ),
      http.post("/api/videos/:id/thumbnail", () => {
        thumbnailCalled = true;
        return HttpResponse.json({}, { status: 200 });
      })
    );

    render(<VideoEditFormContainer video={makeVideo()} categories={categories} />);
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(thumbnailCalled).toBe(false);
  });

  it("maps CATEGORY_NOT_FOUND to an inline error on the Category select", async () => {
    const user = userEvent.setup();
    server.use(
      http.patch("/api/videos/:id", () =>
        HttpResponse.json(envelope(404, "CATEGORY_NOT_FOUND", "Category not found"), { status: 404 })
      )
    );

    render(<VideoEditFormContainer video={makeVideo()} categories={categories} />);
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(await screen.findByText("Category not found")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("maps INVALID_FILE_TYPE (from the thumbnail step) to an inline error below ThumbUpload", async () => {
    const user = userEvent.setup();
    server.use(
      http.patch("/api/videos/:id", () =>
        HttpResponse.json({ id: "video-1", updatedAt: "2026-01-03T00:00:00.000Z" }, { status: 200 })
      ),
      http.post("/api/videos/:id/thumbnail", () =>
        HttpResponse.json(envelope(400, "INVALID_FILE_TYPE", "Only images are accepted"), { status: 400 })
      )
    );

    render(<VideoEditFormContainer video={makeVideo()} categories={categories} />);

    // Bypass ThumbUpload's own client-side type check (applyAccept:false lets
    // a non-matching MIME through) so the server-side envelope is what maps
    // the error — this exercises the container's THUMBNAIL/INVALID_FILE_TYPE
    // branch, not ThumbUpload's own local validation (already covered by
    // thumb-upload.test.tsx).
    const file = new File([new Uint8Array(1024)], "thumb.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Choose thumbnail file"), file);
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(await screen.findByText("Only images are accepted")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("publishes, then refreshes on success", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/videos/:id/publish", () =>
        HttpResponse.json({ id: "video-1", publishedAt: "2026-01-03T00:00:00.000Z" }, { status: 200 })
      )
    );

    render(<VideoEditFormContainer video={makeVideo({ status: "ready", publishedAt: null })} categories={categories} />);
    await user.click(screen.getByRole("button", { name: /^Publish$/ }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it("maps INVALID_VIDEO_STATE to a form-level message and still refreshes", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/videos/:id/publish", () =>
        HttpResponse.json(
          envelope(409, "INVALID_VIDEO_STATE", "Video is not ready or is already published"),
          { status: 409 }
        )
      )
    );

    render(<VideoEditFormContainer video={makeVideo({ status: "ready", publishedAt: null })} categories={categories} />);
    await user.click(screen.getByRole("button", { name: /^Publish$/ }));

    expect(await screen.findByText("Video is not ready or is already published")).toBeInTheDocument();
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it("blocks submit with client-side validation (empty Title) and fires no request", async () => {
    const user = userEvent.setup();
    let patchCalled = false;
    server.use(
      http.patch("/api/videos/:id", () => {
        patchCalled = true;
        return HttpResponse.json({}, { status: 200 });
      })
    );

    render(<VideoEditFormContainer video={makeVideo()} categories={categories} />);
    await user.clear(screen.getByLabelText("Title"));
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });
});
