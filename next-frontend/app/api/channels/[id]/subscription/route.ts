import { NextResponse } from "next/server";

import type { ApiErrorEnvelope } from "@/lib/api/contracts";
import { authedUpstream } from "@/lib/api/authed-upstream";
import { requireSession } from "@/lib/auth/session";

// The `[id]` segment carries the channel **nickname** here: Next.js forbids two
// different dynamic slug names at the same level, and `channels/[id]` already
// exists for `PATCH /api/channels/{id}`.
type Context = { params: Promise<{ id: string }> };

/**
 * `PUT /channels/{nickname}/subscription` passthrough (SI-06.16,
 * social-interactions/TD-03). Idempotent subscribe; the upstream answers `204`.
 */
export async function PUT(_request: Request, { params }: Context) {
  const session = await requireSession({ routeHandler: true });
  if (session instanceof Response) return session;

  const { id: nickname } = await params;

  const { error, response } = await authedUpstream({
    routeHandler: true,
  }).PUT("/channels/{nickname}/subscription", {
    params: { path: { nickname } },
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return new NextResponse(null, { status: 204 });
}

/** `DELETE /channels/{nickname}/subscription` passthrough — unsubscribe. */
export async function DELETE(_request: Request, { params }: Context) {
  const session = await requireSession({ routeHandler: true });
  if (session instanceof Response) return session;

  const { id: nickname } = await params;

  const { error, response } = await authedUpstream({
    routeHandler: true,
  }).DELETE("/channels/{nickname}/subscription", {
    params: { path: { nickname } },
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return new NextResponse(null, { status: 204 });
}
