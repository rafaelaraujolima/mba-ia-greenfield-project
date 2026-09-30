import { NextResponse } from "next/server";

import type { ApiErrorEnvelope, UpdateVideoDto } from "@/lib/api/contracts";
import { authedUpstream } from "@/lib/api/authed-upstream";
import { requireSession } from "@/lib/auth/session";

/**
 * `PATCH /videos/{id}` passthrough (SI-04.33b). `requireSession()` +
 * `authedUpstream({ routeHandler: true })` delegate the 401 → refresh →
 * retry single-flight cycle to `withRefresh()` (per `phase-02-auth-frontend/TD-03`);
 * a 401 that still reaches this handler after that means the refresh itself
 * failed (session fully expired), so it is passed through as-is for the
 * client to redirect to `/login?next=`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession({ routeHandler: true });
  if (session instanceof Response) return session;

  const { id } = await params;
  const body = (await request.json()) as UpdateVideoDto;

  const { data, error, response } = await authedUpstream({
    routeHandler: true,
  }).PATCH("/videos/{id}", {
    params: { path: { id } },
    body: body as never,
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return NextResponse.json(data, { status: 200 });
}
