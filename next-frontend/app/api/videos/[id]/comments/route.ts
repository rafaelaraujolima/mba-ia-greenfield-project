import { NextResponse } from "next/server";

import type {
  ApiErrorEnvelope,
  CommentItem,
  CommentList,
  CreateCommentDto,
} from "@/lib/api/contracts";
import { authedUpstream } from "@/lib/api/authed-upstream";
import { optionalAuthedUpstream } from "@/lib/api/optional-authed-upstream";
import { requireSession } from "@/lib/auth/session";

type Context = { params: Promise<{ id: string }> };

/**
 * `GET /videos/{id}/comments` (SI-06.17). Public read with optional auth
 * (social-interactions/TD-06): without a session — or with an expired one that
 * cannot be refreshed — the anonymous list is returned, never `401`.
 */
export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = searchParams.get("limit");

  const { data, error, response } = await optionalAuthedUpstream({
    routeHandler: true,
  }).GET("/videos/{id}/comments", {
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

  return NextResponse.json<CommentList>(data as CommentList, { status: 200 });
}

/**
 * `POST /videos/{id}/comments` passthrough (SI-06.17). Creates a top-level
 * comment, or a reply when the body carries `parentId`.
 */
export async function POST(request: Request, { params }: Context) {
  const session = await requireSession({ routeHandler: true });
  if (session instanceof Response) return session;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as CreateCommentDto;

  const { data, error, response } = await authedUpstream({
    routeHandler: true,
  }).POST("/videos/{id}/comments", {
    params: { path: { id } },
    body: body as never,
  });

  if (error) {
    return NextResponse.json<ApiErrorEnvelope>(error as ApiErrorEnvelope, {
      status: response.status,
    });
  }

  return NextResponse.json<CommentItem>(data as CommentItem, { status: 201 });
}
