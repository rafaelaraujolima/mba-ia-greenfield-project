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

let PUT: typeof import("@/app/api/channels/[id]/subscription/route").PUT;
let DELETE: typeof import("@/app/api/channels/[id]/subscription/route").DELETE;
let setSession: typeof import("@/lib/auth/session").setSession;
let env: typeof import("@/lib/env").env;

beforeAll(async () => {
  ({ PUT, DELETE } = await import(
    "@/app/api/channels/[id]/subscription/route"
  ));
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

function req(method: "PUT" | "DELETE") {
  return new Request(
    "http://localhost/api/channels/fixture-channel/subscription",
    { method }
  );
}

// The `[id]` segment carries the channel nickname.
function makeParams(nickname: string) {
  return { params: Promise.resolve({ id: nickname }) };
}

beforeEach(() => {
  cookieMap.clear();
});

describe("PUT /api/channels/[nickname]/subscription", () => {
  it("returns 204 and sends PUT with the bearer upstream", async () => {
    await setSession(SEED_SESSION);
    let auth: string | null = null;
    let nickname: string | readonly string[] | undefined;
    server.use(
      http.put(
        `${env.API_URL}/channels/:nickname/subscription`,
        ({ request, params }) => {
          auth = request.headers.get("Authorization");
          nickname = params.nickname;
          return new HttpResponse(null, { status: 204 });
        }
      )
    );

    const res = await PUT(req("PUT"), makeParams("fixture-channel"));

    expect(res.status).toBe(204);
    expect(auth).toBe("Bearer access-token");
    expect(nickname).toBe("fixture-channel");
  });

  it("passes through 403 CANNOT_SUBSCRIBE_OWN_CHANNEL", async () => {
    await setSession(SEED_SESSION);

    const res = await PUT(req("PUT"), makeParams("own-channel"));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: "CANNOT_SUBSCRIBE_OWN_CHANNEL",
    });
  });

  it("passes through 404 CHANNEL_NOT_FOUND", async () => {
    await setSession(SEED_SESSION);

    const res = await PUT(req("PUT"), makeParams("nickname-not-found"));

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "CHANNEL_NOT_FOUND" });
  });

  it("returns 401 UNAUTHORIZED without a session and does not call upstream", async () => {
    let called = false;
    server.use(
      http.put(`${env.API_URL}/channels/:nickname/subscription`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const res = await PUT(req("PUT"), makeParams("fixture-channel"));

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      statusCode: 401,
      error: "UNAUTHORIZED",
    });
    expect(called).toBe(false);
  });
});

describe("DELETE /api/channels/[nickname]/subscription", () => {
  it("returns 204 with a valid session", async () => {
    await setSession(SEED_SESSION);

    const res = await DELETE(req("DELETE"), makeParams("fixture-channel"));

    expect(res.status).toBe(204);
  });

  it("passes through 404 CHANNEL_NOT_FOUND", async () => {
    await setSession(SEED_SESSION);

    const res = await DELETE(req("DELETE"), makeParams("nickname-not-found"));

    expect(res.status).toBe(404);
  });

  it("returns 401 UNAUTHORIZED without a session", async () => {
    const res = await DELETE(req("DELETE"), makeParams("fixture-channel"));

    expect(res.status).toBe(401);
  });
});
