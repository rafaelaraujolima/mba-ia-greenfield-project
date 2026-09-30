import { http, HttpResponse } from "msw";
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

import { server } from "@/mocks/server";

// Cookie store mock for iron-session (same pattern as
// lib/auth/__tests__/refresh.integration.test.ts and
// lib/api/__tests__/authed-upstream.integration.test.ts).
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
}));

let GET: (req: Request) => Promise<Response>;
let setSession: (data: {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  channelSlug: string;
  channelId: string;
}) => Promise<void>;
let getSession: () => Promise<{
  accessToken: string;
  refreshToken: string;
  isLoggedIn: boolean;
}>;
let env: { API_URL: string };
let REFRESH_URL: string;

// Route Handler import is deferred into `beforeAll` (not top-level `await
// import`) for the same ordering reason documented in
// lib/api/__tests__/authed-upstream.integration.test.ts: MSW's
// `server.listen()` (mocks/setup.ts's `beforeAll`) must patch
// `globalThis.fetch` before any module that captures `fetch` at load time is
// imported.
beforeAll(async () => {
  ({ GET } = await import("@/app/api/auth/refresh/route"));
  ({ setSession, getSession } = await import("@/lib/auth/session"));
  ({ env } = await import("@/lib/env"));
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

beforeEach(async () => {
  cookieMap.clear();
  await setSession(SEED_SESSION);
});

function makeRequest(query: string) {
  return new Request(`http://localhost/api/auth/refresh${query}`);
}

// Exhaustive behavior suite for SI-04.21's Route Handler, driven through the
// real `POST /auth/refresh` MSW handler (mocks/handlers/auth.ts) rather than
// a fetcher standing in for the upstream call — see this file's header
// comment in the handoff report for why the SI-04.21 smoke test was removed
// once this file lands.
describe("GET /api/auth/refresh (integration)", () => {
  describe("valid refresh token", () => {
    it("redirects to `next` and renews the session with the tokens issued by POST /auth/refresh", async () => {
      let receivedBody: unknown;
      server.use(
        http.post(REFRESH_URL, async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({
            access_token: "renewed-access-token",
            refresh_token: "renewed-refresh-token",
          });
        })
      );

      const res = await GET(makeRequest("?next=/studio/videos"));

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "http://localhost/studio/videos"
      );

      // Confirms the route actually drove `withRefresh()`'s real upstream
      // call with the session's refresh token, not a synthetic bypass.
      expect(receivedBody).toEqual({ refresh_token: "old-refresh-token" });

      const session = await getSession();
      expect(session.accessToken).toBe("renewed-access-token");
      expect(session.refreshToken).toBe("renewed-refresh-token");
      expect(session.isLoggedIn).toBe(true);
    });

    it("round-trips a `next` containing a query string, still same-origin", async () => {
      const res = await GET(
        makeRequest("?next=" + encodeURIComponent("/studio/videos?page=2"))
      );

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "http://localhost/studio/videos?page=2"
      );
    });
  });

  describe("invalid/expired refresh token", () => {
    it("redirects to /login?next=... and destroys the session", async () => {
      server.use(
        http.post(REFRESH_URL, () => new HttpResponse(null, { status: 401 }))
      );

      const res = await GET(makeRequest("?next=/studio/videos"));

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "http://localhost/login?next=%2Fstudio%2Fvideos"
      );

      const session = await getSession();
      expect(session.isLoggedIn).toBeFalsy();
    });

    it("redirects to /login?next=... when the upstream refresh body is malformed", async () => {
      server.use(
        http.post(REFRESH_URL, () => HttpResponse.json({ nonsense: true }))
      );

      const res = await GET(makeRequest("?next=/studio/videos"));

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "http://localhost/login?next=%2Fstudio%2Fvideos"
      );
    });
  });

  describe("invalid `next`", () => {
    it("returns 400 for a missing `next`", async () => {
      const res = await GET(makeRequest(""));
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body).toMatchObject({ statusCode: 400, error: "BAD_REQUEST" });
    });

    it("returns 400 for an absolute URL `next` (open-redirect guard)", async () => {
      const res = await GET(
        makeRequest("?next=" + encodeURIComponent("https://evil.com"))
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for a protocol-relative `next` (//host open-redirect guard)", async () => {
      const res = await GET(makeRequest("?next=" + encodeURIComponent("//evil.com")));
      expect(res.status).toBe(400);
    });
  });
});
