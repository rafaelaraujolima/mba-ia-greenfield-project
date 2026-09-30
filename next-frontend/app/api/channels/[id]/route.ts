import { NextResponse } from "next/server";

import type { ApiErrorEnvelope, UpdateChannelDto } from "@/lib/api/contracts";
import { authedUpstream } from "@/lib/api/authed-upstream";
import { getSession, requireSession } from "@/lib/auth/session";

/**
 * `PATCH /channels/{id}` passthrough (SI-04.34b). `requireSession()` +
 * `authedUpstream({ routeHandler: true })` delegate the 401 → refresh →
 * retry single-flight cycle to `withRefresh()` (per `phase-02-auth-frontend/TD-03`);
 * a 401 that still reaches this handler after that means the refresh itself
 * failed (session fully expired), so it is passed through as-is for the
 * client to redirect to `/login?next=`.
 *
 * Session side-effect (per `### API Contracts` → BFF tier →
 * `PATCH /api/channels/[id]`): when the upstream response's `nickname`
 * differs from the session's current `channelSlug`, the session cookie is
 * rewritten with the new value so the account menu (`@{nickname}`) and any
 * subsequent `authedUpstream` call reflect the change without requiring a
 * fresh login. `channelId` is left untouched — only the slug changes.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession({ routeHandler: true });
  if (session instanceof Response) return session;

  const { id } = await params;
  const body = (await request.json()) as UpdateChannelDto;

  const { data, error, response } = await authedUpstream({
    routeHandler: true,
  }).PATCH("/channels/{id}", {
    params: { path: { id } },
    body: body as never,
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  if (data.nickname && data.nickname !== session.channelSlug) {
    const liveSession = await getSession();
    liveSession.channelSlug = data.nickname;
    await liveSession.save();
  }

  return NextResponse.json(data, { status: 200 });
}
