import { NextResponse } from "next/server";

import type { ApiErrorEnvelope, SetReactionDto } from "@/lib/api/contracts";
import { authedUpstream } from "@/lib/api/authed-upstream";
import { requireSession } from "@/lib/auth/session";

type Context = { params: Promise<{ id: string }> };

/**
 * `PUT /comments/{id}/reaction` passthrough (SI-06.15, social-interactions/TD-03).
 * Records the requester's like/dislike on a comment; the upstream answers `204`.
 */
export async function PUT(request: Request, { params }: Context) {
  const session = await requireSession({ routeHandler: true });
  if (session instanceof Response) return session;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as SetReactionDto;

  const { error, response } = await authedUpstream({
    routeHandler: true,
  }).PUT("/comments/{id}/reaction", {
    params: { path: { id } },
    body: body as never,
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return new NextResponse(null, { status: 204 });
}

/** `DELETE /comments/{id}/reaction` passthrough — clears the requester's reaction. */
export async function DELETE(_request: Request, { params }: Context) {
  const session = await requireSession({ routeHandler: true });
  if (session instanceof Response) return session;

  const { id } = await params;

  const { error, response } = await authedUpstream({
    routeHandler: true,
  }).DELETE("/comments/{id}/reaction", {
    params: { path: { id } },
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return new NextResponse(null, { status: 204 });
}
