import { http, HttpResponse } from "msw";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { server } from "@/mocks/server";

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

const { GET } = await import("@/app/api/videos/[id]/download/route");
const { setSession } = await import("@/lib/auth/session");
const { env } = await import("@/lib/env");

const SEED_SESSION = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  userId: "user-1",
  email: "alice@example.com",
  channelSlug: "alice",
  channelId: "channel-1",
};

function makeRequest(id: string) {
  return new Request(`http://localhost/api/videos/${id}/download`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  cookieMap.clear();
});

describe("GET /api/videos/[id]/download", () => {
  it("passes through a 302 with Location when a session exists (owner download)", async () => {
    await setSession(SEED_SESSION);
    const res = await GET(makeRequest("video-1"), makeParams("video-1"));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain(
      "response-content-disposition=attachment"
    );
  });

  it("passes through a 302 without a session (anonymous, public video)", async () => {
    const res = await GET(makeRequest("video-2"), makeParams("video-2"));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain(
      "response-content-disposition=attachment"
    );
  });

  it("does not attach an Authorization header when there is no session", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get(`${env.API_URL}/videos/:id/download`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return new HttpResponse(null, {
          status: 302,
          headers: { Location: "https://fixture-storage.example.com/videos/video-3/original.mp4" },
        });
      })
    );
    await GET(makeRequest("video-3"), makeParams("video-3"));
    expect(capturedAuth).toBeNull();
  });

  it("forwards a 404 VIDEO_NOT_FOUND from upstream", async () => {
    const res = await GET(
      makeRequest("video-not-found-id"),
      makeParams("video-not-found-id")
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "VIDEO_NOT_FOUND" });
  });
});
