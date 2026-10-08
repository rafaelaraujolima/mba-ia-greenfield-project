import { http, HttpResponse } from "msw";
import { describe, it, expect, beforeAll } from "vitest";

import { server } from "@/mocks/server";
import { env } from "@/lib/env";

// Import the handler AFTER MSW starts listening (server.listen() runs in
// mocks/setup.ts beforeAll, which fires before test-file beforeAlls).
// Dynamic import here prevents the openapi-fetch client from capturing the
// unpatched global fetch reference (see project memory: route-handler import order).
let GET: (
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) => Promise<Response>;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/videos/[id]/suggestions/route"));
});

function makeRequest(id: string) {
  return new Request(`http://localhost/api/videos/${id}/suggestions`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/videos/[id]/suggestions", () => {
  it("passes through the suggestions list for a visible video", async () => {
    const res = await GET(makeRequest("video-1"), makeParams("video-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: "video-fixture-id",
      title: "Fixture Video Title",
    });
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

  it("does not attach an Authorization header (anonymous endpoint)", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get(`${env.API_URL}/videos/:id/suggestions`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({ items: [] }, { status: 200 });
      })
    );
    await GET(makeRequest("video-2"), makeParams("video-2"));
    expect(capturedAuth).toBeNull();
  });
});
