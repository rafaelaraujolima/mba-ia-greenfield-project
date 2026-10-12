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

let PUT: typeof import("@/app/api/comments/[id]/reaction/route").PUT;
let DELETE: typeof import("@/app/api/comments/[id]/reaction/route").DELETE;
let setSession: typeof import("@/lib/auth/session").setSession;
let env: typeof import("@/lib/env").env;

beforeAll(async () => {
  ({ PUT, DELETE } = await import("@/app/api/comments/[id]/reaction/route"));
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

function put(body: unknown) {
  return new Request("http://localhost/api/comments/comment-1/reaction", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function del() {
  return new Request("http://localhost/api/comments/comment-1/reaction", {
    method: "DELETE",
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  cookieMap.clear();
});

describe("PUT /api/comments/[id]/reaction", () => {
  it("returns 204 and forwards the bearer and body upstream", async () => {
    await setSession(SEED_SESSION);
    let auth: string | null = null;
    let received: unknown;
    server.use(
      http.put(`${env.API_URL}/comments/:id/reaction`, async ({ request }) => {
        auth = request.headers.get("Authorization");
        received = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );

    const res = await PUT(put({ type: "dislike" }), makeParams("comment-1"));

    expect(res.status).toBe(204);
    expect(auth).toBe("Bearer access-token");
    expect(received).toEqual({ type: "dislike" });
  });

  it("passes through 404 COMMENT_NOT_FOUND", async () => {
    await setSession(SEED_SESSION);

    const res = await PUT(put({ type: "like" }), makeParams("comment-not-found-id"));

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "COMMENT_NOT_FOUND" });
  });

  it("passes through a 400 from upstream", async () => {
    await setSession(SEED_SESSION);
    server.use(
      http.put(`${env.API_URL}/comments/:id/reaction`, () =>
        HttpResponse.json(
          { statusCode: 400, error: "BAD_REQUEST", message: "invalid type" },
          { status: 400 }
        )
      )
    );

    const res = await PUT(put({ type: "nope" }), makeParams("comment-1"));

    expect(res.status).toBe(400);
  });

  it("returns 401 UNAUTHORIZED without a session and does not call upstream", async () => {
    let called = false;
    server.use(
      http.put(`${env.API_URL}/comments/:id/reaction`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const res = await PUT(put({ type: "like" }), makeParams("comment-1"));

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      statusCode: 401,
      error: "UNAUTHORIZED",
    });
    expect(called).toBe(false);
  });
});

describe("DELETE /api/comments/[id]/reaction", () => {
  it("returns 204 with a valid session", async () => {
    await setSession(SEED_SESSION);

    const res = await DELETE(del(), makeParams("comment-1"));

    expect(res.status).toBe(204);
  });

  it("passes through 404 COMMENT_NOT_FOUND", async () => {
    await setSession(SEED_SESSION);

    const res = await DELETE(del(), makeParams("comment-not-found-id"));

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "COMMENT_NOT_FOUND" });
  });

  it("returns 401 UNAUTHORIZED without a session", async () => {
    const res = await DELETE(del(), makeParams("comment-1"));

    expect(res.status).toBe(401);
  });
});
