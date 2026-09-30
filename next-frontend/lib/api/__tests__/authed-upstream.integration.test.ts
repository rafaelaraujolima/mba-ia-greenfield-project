import { http, HttpResponse } from "msw";
import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

import { server } from "@/mocks/server";

// Shared cookie store for the session mock — same pattern used by
// refresh.integration.test.ts and require-session.test.ts.
const cookieMap = new Map<string, string>();

// Request headers the "current RSC" is reading from — lets us assert the
// RSC-path redirect forwards the current path via `next=`.
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

// `authed-upstream` (transitively `lib/api/upstream`) must be imported only
// AFTER MSW's `server.listen()` (registered in mocks/setup.ts's `beforeAll`)
// has patched `globalThis.fetch` — `openapi-fetch`'s `createClient()`
// captures `globalThis.fetch` as a default parameter at call time (module
// load), not per-request. A top-level `await import(...)` here would resolve
// during file collection, before that `beforeAll` runs, and the client would
// keep a pre-MSW `fetch` reference that bypasses interception entirely
// (surfacing as a real DNS lookup against the Docker service name). Deferring
// the import into this file's own `beforeAll` guarantees ordering — same
// pattern as app/api/auth/login/__tests__/route.integration.test.ts.
let authedUpstream: typeof import("@/lib/api/authed-upstream").authedUpstream;
let setSession: typeof import("@/lib/auth/session").setSession;
let getSession: typeof import("@/lib/auth/session").getSession;
let env: typeof import("@/lib/env").env;
let CHANNELS_ME_URL: string;
let REFRESH_URL: string;

beforeAll(async () => {
  ({ authedUpstream } = await import("@/lib/api/authed-upstream"));
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

describe("authedUpstream", () => {
  it("attaches Authorization: Bearer <access token> to the upstream request", async () => {
    let receivedAuth: string | null = null;
    server.use(
      http.get(CHANNELS_ME_URL, ({ request }) => {
        receivedAuth = request.headers.get("Authorization");
        return HttpResponse.json(CHANNEL_FIXTURE);
      })
    );

    const { data, error } = await authedUpstream({ routeHandler: true }).GET(
      "/channels/me",
      {}
    );

    expect(error).toBeUndefined();
    expect(data).toEqual(CHANNEL_FIXTURE);
    expect(receivedAuth).toBe(`Bearer ${SEED_SESSION.accessToken}`);
  });

  describe("Route Handler context (routeHandler: true)", () => {
    it("refreshes and retries on 401, returning the retried response with the new token", async () => {
      let callCount = 0;
      const receivedAuthPerCall: (string | null)[] = [];

      server.use(
        http.get(CHANNELS_ME_URL, ({ request }) => {
          callCount++;
          receivedAuthPerCall.push(request.headers.get("Authorization"));
          return callCount === 1
            ? new HttpResponse(null, { status: 401 })
            : HttpResponse.json(CHANNEL_FIXTURE);
        }),
        http.post(REFRESH_URL, () =>
          HttpResponse.json({
            access_token: "refreshed-at",
            refresh_token: "refreshed-rt",
          })
        )
      );

      const { data, error } = await authedUpstream({ routeHandler: true }).GET(
        "/channels/me",
        {}
      );

      expect(error).toBeUndefined();
      expect(data).toEqual(CHANNEL_FIXTURE);
      expect(callCount).toBe(2);
      expect(receivedAuthPerCall[0]).toBe(`Bearer ${SEED_SESSION.accessToken}`);
      expect(receivedAuthPerCall[1]).toBe("Bearer refreshed-at");

      const session = await getSession();
      expect(session.accessToken).toBe("refreshed-at");
    });

    it("single-flight: concurrent 401s trigger exactly one refresh", async () => {
      let refreshCalls = 0;
      server.use(
        http.get(CHANNELS_ME_URL, () => new HttpResponse(null, { status: 401 })),
        http.post(REFRESH_URL, () => {
          refreshCalls++;
          return HttpResponse.json({
            access_token: "refreshed-at",
            refresh_token: "refreshed-rt",
          });
        })
      );

      await Promise.all([
        authedUpstream({ routeHandler: true }).GET("/channels/me", {}),
        authedUpstream({ routeHandler: true }).GET("/channels/me", {}),
      ]);

      expect(refreshCalls).toBe(1);
    });

    it("does not redirect on 401", async () => {
      server.use(
        http.get(CHANNELS_ME_URL, () => new HttpResponse(null, { status: 401 })),
        http.post(REFRESH_URL, () => new HttpResponse(null, { status: 401 }))
      );

      await authedUpstream({ routeHandler: true }).GET("/channels/me", {});

      expect(redirectMock).not.toHaveBeenCalled();
    });
  });

  describe("RSC context (no routeHandler option)", () => {
    it("redirects to /api/auth/refresh?next=<current path> on 401 instead of refreshing directly", async () => {
      requestHeaderMap.set("x-pathname", "/studio/videos/abc");

      let refreshCalls = 0;
      server.use(
        http.get(CHANNELS_ME_URL, () => new HttpResponse(null, { status: 401 })),
        http.post(REFRESH_URL, () => {
          refreshCalls++;
          return HttpResponse.json({
            access_token: "refreshed-at",
            refresh_token: "refreshed-rt",
          });
        })
      );

      await expect(authedUpstream().GET("/channels/me", {})).rejects.toThrow(
        "NEXT_REDIRECT:/api/auth/refresh?next=%2Fstudio%2Fvideos%2Fabc"
      );

      expect(redirectMock).toHaveBeenCalledTimes(1);
      // The refresh-and-retry path (withRefresh / POST /auth/refresh) must
      // never be attempted directly from RSC context.
      expect(refreshCalls).toBe(0);
    });

    it("falls back to /api/auth/refresh?next=%2F when no x-pathname header is present", async () => {
      server.use(
        http.get(CHANNELS_ME_URL, () => new HttpResponse(null, { status: 401 }))
      );

      await expect(authedUpstream().GET("/channels/me", {})).rejects.toThrow(
        "NEXT_REDIRECT:/api/auth/refresh?next=%2F"
      );
    });

    it("passes through a non-401 response without redirecting", async () => {
      server.use(http.get(CHANNELS_ME_URL, () => HttpResponse.json(CHANNEL_FIXTURE)));

      const { data } = await authedUpstream().GET("/channels/me", {});

      expect(data).toEqual(CHANNEL_FIXTURE);
      expect(redirectMock).not.toHaveBeenCalled();
    });
  });
});
