import { NextResponse } from "next/server";

import type { ApiErrorEnvelope } from "@/lib/api/contracts";
import { authedUpstream } from "@/lib/api/authed-upstream";
import { requireSession } from "@/lib/auth/session";

/**
 * `POST /videos/{id}/publish` passthrough (SI-04.33b). See
 * `app/api/videos/[id]/route.ts` for the `requireSession()` +
 * `authedUpstream({ routeHandler: true })` single-flight refresh rationale.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession({ routeHandler: true });
  if (session instanceof Response) return session;

  const { id } = await params;

  const { data, error, response } = await authedUpstream({
    routeHandler: true,
  }).POST("/videos/{id}/publish", {
    params: { path: { id } },
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return NextResponse.json(data, { status: 200 });
}
