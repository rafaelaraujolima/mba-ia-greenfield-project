import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// Shared cookie store for the session mock — same pattern as
// app/api/videos/[id]/thumbnail/__tests__/route.integration.test.ts.
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

// `authedUpstream` (transitively `lib/api/upstream`) must be imported only
// AFTER MSW's `server.listen()` (registered in mocks/setup.ts's `beforeAll`)
// has patched `globalThis.fetch` — see
// lib/api/__tests__/authed-upstream.integration.test.ts for the full
// rationale. Deferring the route module import into this file's own
// `beforeAll` guarantees ordering.
let PATCH: typeof import("@/app/api/videos/[id]/route").PATCH;
let setSession: typeof import("@/lib/auth/session").setSession;

beforeAll(async () => {
  ({ PATCH } = await import("@/app/api/videos/[id]/route"));
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

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/videos/video-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  cookieMap.clear();
});

describe("PATCH /api/videos/[id]", () => {
  it("returns 200 with the updated video when a session exists and the title is valid", async () => {
    await setSession(SEED_SESSION);

    const res = await PATCH(
      makeRequest({ title: "New title", categoryId: "cat-1", visibility: "public" }),
      makeParams("video-1")
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: "video-1" });
    expect(body.updatedAt).toBeTruthy();
  });

  it("returns 401 UNAUTHORIZED without a session", async () => {
    const res = await PATCH(makeRequest({ title: "New title" }), makeParams("video-1"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });

  it("passes through 403 VIDEO_NOT_OWNED", async () => {
    await setSession(SEED_SESSION);

    const res = await PATCH(
      makeRequest({ title: "New title" }),
      makeParams("video-not-owned-id")
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_OWNED" });
  });

  it("passes through 404 VIDEO_NOT_FOUND", async () => {
    await setSession(SEED_SESSION);

    const res = await PATCH(
      makeRequest({ title: "New title" }),
      makeParams("video-not-found-id")
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });

  it("passes through 404 CATEGORY_NOT_FOUND", async () => {
    await setSession(SEED_SESSION);

    const res = await PATCH(
      makeRequest({ title: "New title", categoryId: "category-not-found-id" }),
      makeParams("video-1")
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "CATEGORY_NOT_FOUND" });
  });
});
