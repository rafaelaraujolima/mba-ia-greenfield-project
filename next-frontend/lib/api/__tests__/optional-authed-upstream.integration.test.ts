import { http, HttpResponse } from "msw";
import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

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
  headers: vi.fn().mockResolvedValue({ get: () => null }),
}));

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

// Imported inside `beforeAll` so `openapi-fetch` captures MSW's patched fetch
// (same ordering constraint as authed-upstream.integration.test.ts).
let optionalAuthedUpstream: typeof import("@/lib/api/optional-authed-upstream").optionalAuthedUpstream;
let setSession: typeof import("@/lib/auth/session").setSession;
let getSession: typeof import("@/lib/auth/session").getSession;
let destroySession: typeof import("@/lib/auth/session").destroySession;
let env: typeof import("@/lib/env").env;
let VIDEO_URL: string;
let REFRESH_URL: string;

const VIDEO_ID = "11111111-1111-4111-8111-111111111111";

beforeAll(async () => {
  ({ optionalAuthedUpstream } = await import(
    "@/lib/api/optional-authed-upstream"
  ));
  ({ setSession, getSession, destroySession } = await import(
    "@/lib/auth/session"
  ));
  ({ env } = await import("@/lib/env"));
  VIDEO_URL = `${env.API_URL}/videos/${VIDEO_ID}`;
  REFRESH_URL = `${env.API_URL}/auth/refresh`;
});

function jwt(expSecondsFromNow: number): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode({
    sub: "user-1",
    exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
  })}.signature`;
}

const baseSession = {
  refreshToken: "old-refresh-token",
  userId: "user-1",
  email: "alice@example.com",
  channelSlug: "alice",
  channelId: "channel-1",
};

const VIDEO_BODY = { id: VIDEO_ID, title: "Video" };

function captureAuth(received: (string | null)[]) {
  return http.get(VIDEO_URL, ({ request }) => {
    received.push(request.headers.get("Authorization"));
    return HttpResponse.json(VIDEO_BODY);
  });
}

async function readVideo(options?: { routeHandler?: boolean }) {
  return optionalAuthedUpstream(options).GET("/videos/{id}", {
    params: { path: { id: VIDEO_ID } },
  });
}

beforeEach(() => {
  cookieMap.clear();
  redirectMock.mockClear();
});

describe("optionalAuthedUpstream", () => {
  it("sends the session bearer when there is a logged-in session", async () => {
    const accessToken = jwt(600);
    await setSession({ ...baseSession, accessToken });
    const received: (string | null)[] = [];
    server.use(captureAuth(received));

    const { response } = await readVideo({ routeHandler: true });

    expect(response.status).toBe(200);
    expect(received).toEqual([`Bearer ${accessToken}`]);
  });

  it("calls upstream without Authorization when there is no session", async () => {
    await setSession({ ...baseSession, accessToken: jwt(600) });
    await destroySession();
    const received: (string | null)[] = [];
    server.use(captureAuth(received));

    const { response } = await readVideo();

    expect(response.status).toBe(200);
    expect(received).toEqual([null]);
  });

  it("from a Server Component, an expired token falls back to the anonymous read without redirecting or refreshing", async () => {
    await setSession({ ...baseSession, accessToken: jwt(-60) });
    const received: (string | null)[] = [];
    let refreshCalls = 0;
    server.use(
      captureAuth(received),
      http.post(REFRESH_URL, () => {
        refreshCalls++;
        return HttpResponse.json({ access_token: "x", refresh_token: "y" });
      })
    );

    const { response } = await readVideo();

    expect(response.status).toBe(200);
    expect(received).toEqual([null]);
    expect(refreshCalls).toBe(0);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("from a Server Component, a 401 from upstream retries anonymously instead of redirecting", async () => {
    await setSession({ ...baseSession, accessToken: jwt(600) });
    const received: (string | null)[] = [];
    server.use(
      http.get(VIDEO_URL, ({ request }) => {
        received.push(request.headers.get("Authorization"));
        return received.length === 1
          ? new HttpResponse(null, { status: 401 })
          : HttpResponse.json(VIDEO_BODY);
      })
    );

    const { response } = await readVideo();

    expect(response.status).toBe(200);
    expect(received[1]).toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("from a Route Handler, an expired token is refreshed before the read", async () => {
    await setSession({ ...baseSession, accessToken: jwt(-60) });
    const received: (string | null)[] = [];
    server.use(
      captureAuth(received),
      http.post(REFRESH_URL, () =>
        HttpResponse.json({
          access_token: "refreshed-at",
          refresh_token: "refreshed-rt",
        })
      )
    );

    const { response } = await readVideo({ routeHandler: true });

    expect(response.status).toBe(200);
    expect(received).toEqual(["Bearer refreshed-at"]);
    expect((await getSession()).accessToken).toBe("refreshed-at");
  });

  it("from a Route Handler, a failed refresh falls back to the anonymous read", async () => {
    await setSession({ ...baseSession, accessToken: jwt(-60) });
    const received: (string | null)[] = [];
    server.use(
      captureAuth(received),
      http.post(REFRESH_URL, () => new HttpResponse(null, { status: 401 }))
    );

    const { response } = await readVideo({ routeHandler: true });

    expect(response.status).toBe(200);
    expect(received).toEqual([null]);
  });
});
