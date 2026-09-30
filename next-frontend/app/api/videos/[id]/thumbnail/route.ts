import { NextResponse } from "next/server";

import type { ApiErrorEnvelope } from "@/lib/api/contracts";
import { authedUpstream } from "@/lib/api/authed-upstream";
import { env } from "@/lib/env";
import { getSession, requireSession } from "@/lib/auth/session";

/**
 * Passthrough for `GET /videos/{id}/thumbnail` (SI-04.32b). Session is
 * OPTIONAL: anonymous requesters can see published/public video thumbnails,
 * so this handler must NOT call `requireSession()` (documented exception in
 * the `requireSession()` mutation sweep, `app/api/__tests__/route-handlers-guard.test.ts`).
 * When a session exists, the access token is attached so the owner can also
 * preview draft/unlisted thumbnails; otherwise the upstream call goes out
 * unauthenticated.
 *
 * Uses a direct `fetch` rather than the typed `upstream`/`authedUpstream`
 * clients (deviation from the BFF rule's default, noted here): this endpoint
 * must forward the upstream's raw `302` (status + `Location` header) instead
 * of transparently following it, which requires `redirect: "manual"`. The
 * `openapi-fetch`-based clients build their own internal `Request` object
 * before the final `fetch()` call, which — only in combination with
 * `redirect: "manual"` — falls through this project's MSW test setup instead
 * of being intercepted (real DNS lookups were observed in integration
 * tests). A bare `fetch(url, { redirect: "manual" })` does not have that
 * problem and is intercepted normally.
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

  const response = await fetch(`${env.API_URL}/videos/${id}/thumbnail`, {
    headers,
    redirect: "manual",
  });

  if (response.status === 302) {
    const responseHeaders = new Headers();
    const location = response.headers.get("location");
    if (location) responseHeaders.set("Location", location);
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) responseHeaders.set("Cache-Control", cacheControl);

    return new NextResponse(null, { status: 302, headers: responseHeaders });
  }

  const body = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}

/**
 * `POST /videos/{id}/thumbnail` passthrough (SI-04.33b). Multipart body is
 * re-packed into a fresh `FormData` (rather than forwarding the incoming
 * `Request` body stream as-is) so `openapi-fetch`'s default body serializer
 * — which passes `FormData` instances through untouched, letting the
 * underlying `fetch` set the `multipart/form-data` boundary itself — can do
 * its job the same way it does for JSON bodies elsewhere in this project.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession({ routeHandler: true });
  if (session instanceof Response) return session;

  const { id } = await params;
  const incomingFormData = await request.formData();
  const thumbnail = incomingFormData.get("thumbnail");

  const formData = new FormData();
  if (thumbnail) formData.set("thumbnail", thumbnail);

  const { data, error, response } = await authedUpstream({
    routeHandler: true,
  }).POST("/videos/{id}/thumbnail", {
    params: { path: { id } },
    body: formData as never,
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return NextResponse.json(data, { status: 200 });
}
