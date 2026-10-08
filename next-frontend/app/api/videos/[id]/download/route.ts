import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getSession } from "@/lib/auth/session";

/**
 * Passthrough for `GET /videos/{id}/download` (SI-05.4, video-watch-page/TD-07).
 * Session is OPTIONAL: anonymous requesters can download published/public
 * videos, so this handler must NOT call `requireSession()` (same documented
 * exception as `app/api/videos/[id]/thumbnail/route.ts`). When a session
 * exists, the access token is attached so the owner can also download a
 * draft/unlisted video.
 *
 * Uses a direct `fetch` rather than the typed `upstream`/`authedUpstream`
 * clients, mirroring the thumbnail route's documented deviation: this
 * endpoint must forward the upstream's raw `302` (status + `Location`
 * header) instead of transparently following it, which requires
 * `redirect: "manual"` — a mode the typed client's internal `Request`
 * construction does not play well with under this project's MSW test setup.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();

  const headers: Record<string, string> = {};
  if (session.isLoggedIn) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${env.API_URL}/videos/${id}/download`, {
    headers,
    redirect: "manual",
  });

  if (response.status === 302) {
    const responseHeaders = new Headers();
    const location = response.headers.get("location");
    if (location) responseHeaders.set("Location", location);

    return new NextResponse(null, { status: 302, headers: responseHeaders });
  }

  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}
