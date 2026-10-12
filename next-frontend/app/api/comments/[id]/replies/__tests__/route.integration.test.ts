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

let GET: typeof import("@/app/api/comments/[id]/replies/route").GET;
let setSession: typeof import("@/lib/auth/session").setSession;
let env: typeof import("@/lib/env").env;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/comments/[id]/replies/route"));
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

function makeRequest() {
  return new Request("http://localhost/api/comments/comment-1/replies");
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  cookieMap.clear();
});

describe("GET /api/comments/[id]/replies", () => {
  it("returns { items, nextCursor } anonymously without a session", async () => {
    let auth: string | null = "unset";
    server.use(
      http.get(`${env.API_URL}/comments/:id/replies`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({ items: [], nextCursor: null });
      })
    );

    const res = await GET(makeRequest(), makeParams("comment-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], nextCursor: null });
    expect(auth).toBeNull();
  });

  it("sends the bearer when logged in and returns the replies", async () => {
    await setSession(SEED_SESSION);
    let auth: string | null = null;
    server.use(
      http.get(`${env.API_URL}/comments/:id/replies`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return HttpResponse.json({ items: [], nextCursor: null });
      })
    );

    const res = await GET(makeRequest(), makeParams("comment-1"));

    expect(res.status).toBe(200);
    expect(auth).toBe(`Bearer ${SEED_SESSION.accessToken}`);
  });

  it("returns the fixture replies with the parent id", async () => {
    const res = await GET(makeRequest(), makeParams("comment-1"));

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].parentId).toBe("comment-1");
  });

  it("passes through 404 COMMENT_NOT_FOUND", async () => {
    const res = await GET(makeRequest(), makeParams("comment-not-found-id"));

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "COMMENT_NOT_FOUND" });
  });
});
