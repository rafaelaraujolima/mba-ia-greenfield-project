import { http, HttpResponse } from "msw";

import type {
  ApiErrorEnvelope,
  CommentItem,
  CommentList,
  CommentReplies,
  SubscriptionFeed,
  SubscriptionList,
} from "@/lib/api/contracts";
import { env } from "@/lib/env";

import {
  buildCommentItem,
  buildCommentList,
  buildSubscriptionFeed,
  buildSubscriptionFeedItem,
  buildSubscriptionItem,
} from "../factories/social";

// Reserved trigger table (shared with E2E — trigger values must not collide
// with other domains' fixture values).
const VIDEO_NOT_FOUND_ID = "video-not-found-id";
const COMMENT_NOT_FOUND_ID = "comment-not-found-id";
const NICKNAME_NOT_FOUND = "nickname-not-found";
const OWN_CHANNEL_NICKNAME = "own-channel";
// Parent that already sits at the maximum depth (TD-04): replying fails.
const COMMENT_DEPTH_EXCEEDED_ID = "comment-depth-exceeded-id";

function errorEnvelope(
  statusCode: number,
  error: string,
  message: string
): ApiErrorEnvelope {
  return { statusCode, error, message, code: null };
}

function notFound(error: string, message: string) {
  return HttpResponse.json(errorEnvelope(404, error, message), { status: 404 });
}

function unauthorized(request: Request) {
  return request.headers.get("Authorization")
    ? null
    : HttpResponse.json(
        errorEnvelope(401, "UNAUTHORIZED", "Missing or invalid access token"),
        { status: 401 }
      );
}

const noContent = () => new HttpResponse(null, { status: 204 });

export const handlers = [
  // PUT /videos/:id/reaction
  http.put(`${env.API_URL}/videos/:id/reaction`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    if (params.id === VIDEO_NOT_FOUND_ID) {
      return notFound("VIDEO_NOT_FOUND", "Video not found");
    }
    return noContent();
  }),

  // DELETE /videos/:id/reaction
  http.delete(`${env.API_URL}/videos/:id/reaction`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    if (params.id === VIDEO_NOT_FOUND_ID) {
      return notFound("VIDEO_NOT_FOUND", "Video not found");
    }
    return noContent();
  }),

  // PUT /comments/:id/reaction
  http.put(`${env.API_URL}/comments/:id/reaction`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    if (params.id === COMMENT_NOT_FOUND_ID) {
      return notFound("COMMENT_NOT_FOUND", "Comment not found");
    }
    return noContent();
  }),

  // DELETE /comments/:id/reaction
  http.delete(`${env.API_URL}/comments/:id/reaction`, ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    if (params.id === COMMENT_NOT_FOUND_ID) {
      return notFound("COMMENT_NOT_FOUND", "Comment not found");
    }
    return noContent();
  }),

  // PUT /channels/:nickname/subscription
  http.put(
    `${env.API_URL}/channels/:nickname/subscription`,
    ({ request, params }) => {
      const denied = unauthorized(request);
      if (denied) return denied;
      if (params.nickname === NICKNAME_NOT_FOUND) {
        return notFound("CHANNEL_NOT_FOUND", "Channel not found");
      }
      if (params.nickname === OWN_CHANNEL_NICKNAME) {
        return HttpResponse.json(
          errorEnvelope(
            403,
            "CANNOT_SUBSCRIBE_OWN_CHANNEL",
            "You cannot subscribe to your own channel"
          ),
          { status: 403 }
        );
      }
      return noContent();
    }
  ),

  // DELETE /channels/:nickname/subscription
  http.delete(
    `${env.API_URL}/channels/:nickname/subscription`,
    ({ request, params }) => {
      const denied = unauthorized(request);
      if (denied) return denied;
      if (params.nickname === NICKNAME_NOT_FOUND) {
        return notFound("CHANNEL_NOT_FOUND", "Channel not found");
      }
      return noContent();
    }
  ),

  // GET /videos/:id/comments — public read; cursor "page-2" serves the last page.
  http.get(`${env.API_URL}/videos/:id/comments`, ({ request, params }) => {
    if (params.id === VIDEO_NOT_FOUND_ID) {
      return notFound("VIDEO_NOT_FOUND", "Video not found");
    }
    const cursor = new URL(request.url).searchParams.get("cursor");
    const isLastPage = cursor === "page-2";
    const authed = request.headers.has("Authorization");
    const items = Array.from({ length: 2 }, (_, i) =>
      buildCommentItem({
        id: `comment-${isLastPage ? 2 : 1}-${i + 1}`,
        body: `Fixture comment ${isLastPage ? 2 : 1}-${i + 1}`,
        replyCount: i === 0 ? 2 : 0,
        viewerState: authed ? { reaction: null } : null,
      })
    );
    return HttpResponse.json<CommentList>(
      buildCommentList({
        items,
        nextCursor: isLastPage ? null : "page-2",
        totalCount: 4,
      }),
      { status: 200 }
    );
  }),

  // POST /videos/:id/comments
  http.post(`${env.API_URL}/videos/:id/comments`, async ({ request, params }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    if (params.id === VIDEO_NOT_FOUND_ID) {
      return notFound("VIDEO_NOT_FOUND", "Video not found");
    }
    const body = (await request.json()) as { body?: string; parentId?: string };
    if (body.parentId === COMMENT_NOT_FOUND_ID) {
      return notFound("COMMENT_NOT_FOUND", "Comment not found");
    }
    if (body.parentId === COMMENT_DEPTH_EXCEEDED_ID) {
      return HttpResponse.json(
        errorEnvelope(
          400,
          "COMMENT_DEPTH_EXCEEDED",
          "Replies to replies are not allowed"
        ),
        { status: 400 }
      );
    }
    return HttpResponse.json<CommentItem>(
      buildCommentItem({
        id: "comment-created-id",
        parentId: body.parentId ?? null,
        body: body.body ?? "",
        viewerState: { reaction: null },
      }),
      { status: 201 }
    );
  }),

  // GET /comments/:id/replies
  http.get(`${env.API_URL}/comments/:id/replies`, ({ request, params }) => {
    if (params.id === COMMENT_NOT_FOUND_ID) {
      return notFound("COMMENT_NOT_FOUND", "Comment not found");
    }
    const authed = request.headers.has("Authorization");
    return HttpResponse.json<CommentReplies>(
      {
        items: [1, 2].map((n) =>
          buildCommentItem({
            id: `reply-${params.id as string}-${n}`,
            parentId: params.id as string,
            body: `Fixture reply ${n}`,
            viewerState: authed ? { reaction: null } : null,
          })
        ),
        nextCursor: null,
      },
      { status: 200 }
    );
  }),

  // GET /subscriptions — followed channels (left menu)
  http.get(`${env.API_URL}/subscriptions`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    return HttpResponse.json<SubscriptionList>(
      {
        items: [
          buildSubscriptionItem(),
          buildSubscriptionItem({
            channelId: "channel-fixture-id-2",
            channelName: "Second Channel",
            channelNickname: "second-channel",
          }),
        ],
      },
      { status: 200 }
    );
  }),

  // GET /subscriptions/videos — feed of followed channels
  http.get(`${env.API_URL}/subscriptions/videos`, ({ request }) => {
    const denied = unauthorized(request);
    if (denied) return denied;
    const page = Number(new URL(request.url).searchParams.get("page") ?? "1");
    return HttpResponse.json<SubscriptionFeed>(
      buildSubscriptionFeed({
        items: [1, 2].map((n) =>
          buildSubscriptionFeedItem({
            id: `feed-video-${page}-${n}`,
            title: `Feed video ${page}-${n}`,
          })
        ),
        page,
        total: 2,
      }),
      { status: 200 }
    );
  }),
];
