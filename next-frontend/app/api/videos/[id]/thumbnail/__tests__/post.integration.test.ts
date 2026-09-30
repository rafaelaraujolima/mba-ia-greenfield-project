import { http, HttpResponse } from "msw";
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

import { server } from "@/mocks/server";

// Shared cookie store for the session mock — same pattern as the sibling
// GET test (route.integration.test.ts).
const cookieMap = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (name: string) =>
      cookieMap.has(name) ? { name, value: cookieMap.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieMap.set(name, value);
    },
    delete: (name: string) => {
      cookieMap.delete(name);
    },
  }),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// See app/api/videos/[id]/__tests__/route.integration.test.ts for why these
// imports are deferred into beforeAll (MSW `server.listen()` ordering).
let POST: typeof import("@/app/api/videos/[id]/thumbnail/route").POST;
let setSession: typeof import("@/lib/auth/session").setSession;
let env: typeof import("@/lib/env").env;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/videos/[id]/thumbnail/route"));
  ({ setSession } = await import("@/lib/auth/session"));
  ({ env } = await import("@/lib/env"));
});

const SEED_SESSION = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  userId: "user-1",
  email: "alice@example.com",
  channelSlug: "alice",
  channelId: "channel-1",
};

function makeFile(name: string, type: string, sizeBytes: number) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function makeRequest(id: string, file: File) {
  const formData = new FormData();
  formData.set("thumbnail", file);
  return new Request(`http://localhost/api/videos/${id}/thumbnail`, {
    method: "POST",
    body: formData,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  cookieMap.clear();
});

describe("POST /api/videos/[id]/thumbnail", () => {
  it("forwards a valid image as multipart and returns 200 with the upload result", async () => {
    await setSession(SEED_SESSION);
    const file = makeFile("thumb.png", "image/png", 1024);

    let receivedContentType: string | null = null;
    let receivedFileName: string | undefined;
    server.use(
      http.post(`${env.API_URL}/videos/:id/thumbnail`, async ({ request }) => {
        receivedContentType = request.headers.get("content-type");
        const formData = await request.formData();
        const thumbnail = formData.get("thumbnail");
        receivedFileName = thumbnail instanceof File ? thumbnail.name : undefined;
        return HttpResponse.json(
          { id: "video-1", thumbnailKey: "thumbnails/video-1.jpg", updatedAt: "2026-01-03T00:00:00.000Z" },
          { status: 200 }
        );
      })
    );

    const res = await POST(makeRequest("video-1", file), makeParams("video-1"));

    expect(res.status).toBe(200);
    expect(receivedContentType).toContain("multipart/form-data");
    expect(receivedFileName).toBe("thumb.png");
    const body = await res.json();
    expect(body).toMatchObject({ id: "video-1", thumbnailKey: "thumbnails/video-1.jpg" });
  });

  it("returns 400 INVALID_FILE_TYPE for a non-image file", async () => {
    await setSession(SEED_SESSION);
    const file = makeFile("notes.txt", "text/plain", 100);

    const res = await POST(makeRequest("video-1", file), makeParams("video-1"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "INVALID_FILE_TYPE" });
  });

  it("returns 400 THUMBNAIL_SIZE_EXCEEDED for an oversized image", async () => {
    await setSession(SEED_SESSION);
    const file = makeFile("big.png", "image/png", 6 * 1024 * 1024);

    const res = await POST(makeRequest("video-1", file), makeParams("video-1"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "THUMBNAIL_SIZE_EXCEEDED" });
  });

  it("returns 401 UNAUTHORIZED without a session", async () => {
    const file = makeFile("thumb.png", "image/png", 1024);

    const res = await POST(makeRequest("video-1", file), makeParams("video-1"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });
});
