import { http, HttpResponse } from "msw";
import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

import { server } from "@/mocks/server";

/**
 * Confirms the handoff contract between `authed-upstream.ts` (SI-04.19) and
 * the `GET /api/auth/refresh` Route Handler (SI-04.21) actually composes:
 * the `next` URL an RSC's 401 builds is exactly what the refresh route reads
 * and, on success, redirects back to — without a fresh login, as long as the
 * refresh token is still valid.
 *
 * This does not exercise a real page/route — it drives the two units
 * directly, MSW standing in for both the protected upstream resource and
 * `POST /auth/refresh`.
 */

const cookieMap = new Map<string, string>();
let requestHeaderMap = new Map<string, string>();

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
  headers: vi.fn().mockImplementation(async () => ({
    get: (name: string) => requestHeaderMap.get(name) ?? null,
  })),
}));

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

let authedUpstream: typeof import("@/lib/api/authed-upstream").authedUpstream;
let refreshRouteGET: (req: Request) => Promise<Response>;
let setSession: typeof import("@/lib/auth/session").setSession;
let getSession: typeof import("@/lib/auth/session").getSession;
let env: typeof import("@/lib/env").env;
let CHANNELS_ME_URL: string;
let REFRESH_URL: string;

// Deferred imports — same ordering constraint as authed-upstream.integration.test.ts
// (openapi-fetch captures `globalThis.fetch` at module load; MSW must patch
// it first via mocks/setup.ts's `beforeAll`).
beforeAll(async () => {
  ({ authedUpstream } = await import("@/lib/api/authed-upstream"));
  ({ GET: refreshRouteGET } = await import("@/app/api/auth/refresh/route"));
  ({ setSession, getSession } = await import("@/lib/auth/session"));
  ({ env } = await import("@/lib/env"));
  CHANNELS_ME_URL = `${env.API_URL}/channels/me`;
  REFRESH_URL = `${env.API_URL}/auth/refresh`;
});

const SEED_SESSION = {
  accessToken: "old-access-token",
  refreshToken: "old-refresh-token",
  userId: "user-1",
  email: "alice@example.com",
  channelSlug: "alice",
  channelId: "channel-1",
};

const CHANNEL_FIXTURE = {
  id: "channel-1",
  name: "Alice",
  nickname: "alice",
  description: null,
};

beforeEach(async () => {
  cookieMap.clear();
  requestHeaderMap = new Map();
  redirectMock.mockClear();
  await setSession(SEED_SESSION);
});

describe("authed-upstream -> GET /api/auth/refresh chain", () => {
  it("renews the session and hands back to the original RSC destination on a valid refresh token", async () => {
    requestHeaderMap.set("x-pathname", "/studio/videos/abc");

    // The RSC's protected call is 401 on every attempt within this test —
    // `authed-upstream`'s RSC path must never retry it directly; only the
    // refresh route (driven separately below) is allowed to touch
    // POST /auth/refresh.
    server.use(
      http.get(CHANNELS_ME_URL, () => new HttpResponse(null, { status: 401 }))
    );

    // Step 1: RSC receives 401 from upstream via authed-upstream — captures
    // the redirect target `authed-upstream` builds instead of letting the
    // mocked `redirect()` throw uncaught.
    await expect(authedUpstream().GET("/channels/me", {})).rejects.toThrow(
      "NEXT_REDIRECT:"
    );

    expect(redirectMock).toHaveBeenCalledTimes(1);
    const redirectTarget = redirectMock.mock.calls[0][0] as string;
    expect(redirectTarget).toBe(
      "/api/auth/refresh?next=%2Fstudio%2Fvideos%2Fabc"
    );

    // Step 2: the browser would navigate to that same-origin path — drive
    // the refresh Route Handler with the exact URL authed-upstream produced,
    // this time letting the real POST /auth/refresh MSW handler renew the
    // session (the channel resource is irrelevant to the refresh route).
    server.use(
      http.post(REFRESH_URL, () =>
        HttpResponse.json({
          access_token: "renewed-access-token",
          refresh_token: "renewed-refresh-token",
        })
      )
    );

    const refreshResponse = await refreshRouteGET(
      new Request(`http://localhost${redirectTarget}`)
    );

    // Step 3: the refresh route's success path lands back at the exact path
    // the original RSC 401'd from — no fresh login required.
    expect(refreshResponse.status).toBe(307);
    expect(refreshResponse.headers.get("location")).toBe(
      "http://localhost/studio/videos/abc"
    );

    const session = await getSession();
    expect(session.isLoggedIn).toBe(true);
    expect(session.accessToken).toBe("renewed-access-token");
    expect(session.refreshToken).toBe("renewed-refresh-token");

    // Step 4: with the renewed access token, the originally-401'ing
    // resource now succeeds — closing the loop end-to-end.
    server.use(
      http.get(CHANNELS_ME_URL, ({ request }) => {
        expect(request.headers.get("Authorization")).toBe(
          "Bearer renewed-access-token"
        );
        return HttpResponse.json(CHANNEL_FIXTURE);
      })
    );

    const { data, error } = await authedUpstream().GET("/channels/me", {});
    expect(error).toBeUndefined();
    expect(data).toEqual(CHANNEL_FIXTURE);
    expect(redirectMock).toHaveBeenCalledTimes(1); // no second redirect needed
  });

  it("sends the user to /login with the original destination preserved when the refresh token is invalid", async () => {
    requestHeaderMap.set("x-pathname", "/studio/channel");

    server.use(
      http.get(CHANNELS_ME_URL, () => new HttpResponse(null, { status: 401 }))
    );

    await expect(authedUpstream().GET("/channels/me", {})).rejects.toThrow(
      "NEXT_REDIRECT:"
    );
    const redirectTarget = redirectMock.mock.calls[0][0] as string;
    expect(redirectTarget).toBe("/api/auth/refresh?next=%2Fstudio%2Fchannel");

    server.use(
      http.post(REFRESH_URL, () => new HttpResponse(null, { status: 401 }))
    );

    const refreshResponse = await refreshRouteGET(
      new Request(`http://localhost${redirectTarget}`)
    );

    expect(refreshResponse.status).toBe(307);
    expect(refreshResponse.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fstudio%2Fchannel"
    );

    const session = await getSession();
    expect(session.isLoggedIn).toBeFalsy();
  });
});
