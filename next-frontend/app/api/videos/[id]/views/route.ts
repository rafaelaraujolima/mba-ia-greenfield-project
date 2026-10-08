import { NextResponse } from "next/server";

import type { ApiErrorEnvelope } from "@/lib/api/contracts";
import { upstream } from "@/lib/api/upstream";

/**
 * `POST /videos/{id}/views` passthrough (SI-05.4). Anonymous — no session
 * involved, mirroring the backend's `@Public()` endpoint (video-watch-page/TD-02).
 * The client identity for dedup is derived server-side by the upstream from
 * the request IP, not from anything the BFF needs to forward.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error, response } = await upstream.POST("/videos/{id}/views", {
    params: { path: { id } },
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return new NextResponse(null, { status: 204 });
}
