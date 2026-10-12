import { NextResponse } from "next/server";

import type { ApiErrorEnvelope, CommentReplies } from "@/lib/api/contracts";
import { optionalAuthedUpstream } from "@/lib/api/optional-authed-upstream";

/**
 * `GET /comments/{id}/replies` (SI-06.17). Public read with optional auth
 * (social-interactions/TD-06), so the viewer's reaction state comes back when
 * there is a session and the anonymous page otherwise.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = searchParams.get("limit");

  const { data, error, response } = await optionalAuthedUpstream({
    routeHandler: true,
  }).GET("/comments/{id}/replies", {
    params: {
      path: { id },
      query: {
        ...(cursor ? { cursor } : {}),
        ...(limit ? { limit } : {}),
      } as never,
    },
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return NextResponse.json<CommentReplies>(data as CommentReplies, {
    status: 200,
  });
}
