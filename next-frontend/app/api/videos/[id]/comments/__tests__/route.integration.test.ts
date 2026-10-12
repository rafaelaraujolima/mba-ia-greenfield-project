import { http, HttpResponse } from "msw";
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

import { server } from "@/mocks/server";

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

let GET: typeof import("@/app/api/videos/[id]/comments/route").GET;
let POST: typeof import("@/app/api/videos/[id]/comments/route").POST;
let setSession: typeof import("@/lib/auth/session").setSession;
let env: typeof import("@/lib/env").env;

beforeAll(async () => {
  ({ GET, POST } = await import("@/app/api/videos/[id]/comments/route"));
  ({ setSession } = await import("@/lib/auth/session"));
  ({ env } = await import("@/lib/env"));
});

function jwt(expSecondsFromNow: number): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode({
    sub: "user-1",
    exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
  })}.signature`;
}

const SEED_SESSION = {
  accessToken: jwt(600),
  refreshToken: "refresh-token",
  userId: "user-1",
  email: "alice@example.com",
  channelSlug: "alice",
  channelId: "channel-1",
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function getRequest(query = "") {
  return new Request(`http://localhost/api/videos/video-1/comments${query}`);
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/videos/video-1/comments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  cookieMap.clear();
});

describe("GET /api/videos/[id]/comments", () => {
  it("returns the anonymous list without Authorization when there is no session", async () => {
    let auth: string | null = "unset";
    server.use(
      http.get(`${env.API_URL}/videos/:id/comments`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({
          items: [],
          nextCursor: null,
          totalCount: 0,
        });
      })
    );

    const res = await GET(getRequest(), makeParams("video-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      items: [],
      nextCursor: null,
      totalCount: 0,
    });
    expect(auth).toBeNull();
  });

  it("forwards cursor and limit and sends the bearer when logged in", async () => {
    await setSession(SEED_SESSION);
    let auth: string | null = null;
    let search = "";
    server.use(
      http.get(`${env.API_URL}/videos/:id/comments`, ({ request }) => {
        auth = request.headers.get("Authorization");
        search = new URL(request.url).search;
        return HttpResponse.json({
          items: [],
          nextCursor: null,
          totalCount: 0,
        });
      })
    );

    const res = await GET(
      getRequest("?cursor=page-2&limit=5"),
      makeParams("video-1")
    );

    expect(res.status).toBe(200);
    expect(auth).toBe(`Bearer ${SEED_SESSION.accessToken}`);
    expect(search).toContain("cursor=page-2");
    expect(search).toContain("limit=5");
  });

  it("returns the page from the fixture handler (items, nextCursor, totalCount)", async () => {
    const res = await GET(getRequest(), makeParams("video-1"));

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.nextCursor).toBe("page-2");
    expect(body.totalCount).toBe(4);
  });

  it("passes through 404 VIDEO_NOT_FOUND", async () => {
    const res = await GET(getRequest(), makeParams("video-not-found-id"));

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });
});

describe("POST /api/videos/[id]/comments", () => {
  it("returns 201 with the created comment", async () => {
    await setSession(SEED_SESSION);

    const res = await POST(postRequest({ body: "Nice video" }), makeParams("video-1"));

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      id: "comment-created-id",
      body: "Nice video",
    });
  });

  it("returns 401 UNAUTHORIZED without a session and does not call upstream", async () => {
    let called = false;
    server.use(
      http.post(`${env.API_URL}/videos/:id/comments`, () => {
        called = true;
        return new HttpResponse(null, { status: 201 });
      })
    );

    const res = await POST(postRequest({ body: "Nice video" }), makeParams("video-1"));

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      statusCode: 401,
      error: "UNAUTHORIZED",
    });
    expect(called).toBe(false);
  });

  it.each([
    ["COMMENT_DEPTH_EXCEEDED", 400, "comment-depth-exceeded-id", "video-1"],
    ["COMMENT_NOT_FOUND", 404, "comment-not-found-id", "video-1"],
    ["VIDEO_NOT_FOUND", 404, undefined, "video-not-found-id"],
  ] as const)(
    "passes through %s (%s) from upstream",
    async (error, status, parentId, videoId) => {
      await setSession(SEED_SESSION);

      const res = await POST(
        postRequest({ body: "Reply", ...(parentId ? { parentId } : {}) }),
        makeParams(videoId)
      );

      expect(res.status).toBe(status);
      expect(await res.json()).toMatchObject({ error });
    }
  );
});
