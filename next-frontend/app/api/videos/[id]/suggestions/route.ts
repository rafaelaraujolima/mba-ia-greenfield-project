import { NextResponse } from "next/server";

import type { ApiErrorEnvelope, VideoSuggestions } from "@/lib/api/contracts";
import { upstream } from "@/lib/api/upstream";

/**
 * `GET /videos/{id}/suggestions` passthrough (SI-05.4). Anonymous — no
 * session involved, mirroring the backend's `@Public()` endpoint
 * (video-watch-page/TD-03). The sidebar always renders the backend's default
 * page size (5, matching the `VideoCard ×5` slot), so no query param is
 * forwarded.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error, response } = await upstream.GET(
    "/videos/{id}/suggestions",
    { params: { path: { id } } }
  );

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return NextResponse.json<VideoSuggestions>(data, { status: 200 });
}
