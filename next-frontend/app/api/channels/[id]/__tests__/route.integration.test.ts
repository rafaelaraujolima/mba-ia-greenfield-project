import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// Shared cookie store for the session mock — same pattern as
// app/api/videos/[id]/__tests__/route.integration.test.ts.
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
let PATCH: typeof import("@/app/api/channels/[id]/route").PATCH;
let setSession: typeof import("@/lib/auth/session").setSession;
let getSession: typeof import("@/lib/auth/session").getSession;

beforeAll(async () => {
  ({ PATCH } = await import("@/app/api/channels/[id]/route"));
  ({ setSession, getSession } = await import("@/lib/auth/session"));
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
  return new Request("http://localhost/api/channels/channel-1", {
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

describe("PATCH /api/channels/[id]", () => {
  it("returns 200 with the updated channel when a session exists and the data is valid", async () => {
    await setSession(SEED_SESSION);

    const res = await PATCH(
      makeRequest({ nickname: "new_handle", name: "New Name", description: "New bio" }),
      makeParams("channel-1")
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: "channel-1", nickname: "new_handle", name: "New Name" });
    expect(body.updatedAt).toBeTruthy();
  });

  it("rewrites the session's channelSlug when the nickname changes", async () => {
    await setSession(SEED_SESSION);

    await PATCH(makeRequest({ nickname: "new_handle" }), makeParams("channel-1"));

    const session = await getSession();
    expect(session.channelSlug).toBe("new_handle");
    // channelId must be preserved unchanged.
    expect(session.channelId).toBe("channel-1");
  });

  it("leaves the session's channelSlug untouched when the nickname does not change", async () => {
    await setSession(SEED_SESSION);

    await PATCH(
      makeRequest({ nickname: "alice", name: "Only name changes" }),
      makeParams("channel-1")
    );

    const session = await getSession();
    expect(session.channelSlug).toBe("alice");
  });

  it("returns 401 UNAUTHORIZED without a session", async () => {
    const res = await PATCH(makeRequest({ name: "New Name" }), makeParams("channel-1"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "UNAUTHORIZED" });
  });

  it("passes through 403 CHANNEL_NOT_OWNED", async () => {
    await setSession(SEED_SESSION);

    const res = await PATCH(
      makeRequest({ name: "New Name" }),
      makeParams("channel-not-owned-id")
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "CHANNEL_NOT_OWNED" });
  });

  it("passes through 404 CHANNEL_NOT_FOUND", async () => {
    await setSession(SEED_SESSION);

    const res = await PATCH(
      makeRequest({ name: "New Name" }),
      makeParams("channel-not-found-id")
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "CHANNEL_NOT_FOUND" });
  });

  it("passes through 409 NICKNAME_ALREADY_EXISTS and does not touch the session", async () => {
    await setSession(SEED_SESSION);

    const res = await PATCH(
      makeRequest({ nickname: "already-used-nickname" }),
      makeParams("channel-1")
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toMatchObject({ error: "NICKNAME_ALREADY_EXISTS" });

    const session = await getSession();
    expect(session.channelSlug).toBe("alice");
  });
});
