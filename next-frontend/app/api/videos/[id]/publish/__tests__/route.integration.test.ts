import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// Shared cookie store for the session mock — same pattern used across the
// other route-handler integration tests in this screen's test set.
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
let POST: typeof import("@/app/api/videos/[id]/publish/route").POST;
let setSession: typeof import("@/lib/auth/session").setSession;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/videos/[id]/publish/route"));
  ({ setSession } = await import("@/lib/auth/session"));
});

const SEED_SESSION = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  userId: "user-1",
  email: "alice@example.com",
  channelSlug: "alice",
  channelId: "channel-1",
};

function makeRequest(id: string) {
  return new Request(`http://localhost/api/videos/${id}/publish`, { method: "POST" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  cookieMap.clear();
});

describe("POST /api/videos/[id]/publish", () => {
  it("returns 200 with publishedAt on success", async () => {
    await setSession(SEED_SESSION);

    const res = await POST(makeRequest("video-1"), makeParams("video-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: "video-1" });
    expect(body.publishedAt).toBeTruthy();
  });

  it("returns 409 INVALID_VIDEO_STATE when the video is not ready or already published", async () => {
    await setSession(SEED_SESSION);

    const res = await POST(makeRequest("video-invalid-state-id"), makeParams("video-invalid-state-id"));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toMatchObject({ error: "INVALID_VIDEO_STATE" });
  });

  it("returns 401 UNAUTHORIZED without a session", async () => {
    const res = await POST(makeRequest("video-1"), makeParams("video-1"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });
});
