import { describe, expect, it } from "vitest";

import type {
  ApiErrorEnvelope,
  CommentItem,
  CommentList,
  CommentReplies,
  SubscriptionFeed,
  SubscriptionList,
} from "@/lib/api/contracts";
import { env } from "@/lib/env";

const AUTH = { Authorization: "Bearer fixture-access-token" };
const JSON_AUTH = { ...AUTH, "Content-Type": "application/json" };

describe("MSW handlers — social", () => {
  describe("reactions", () => {
    it.each([
      ["PUT", `${env.API_URL}/videos/video-1/reaction`],
      ["DELETE", `${env.API_URL}/videos/video-1/reaction`],
      ["PUT", `${env.API_URL}/comments/comment-1/reaction`],
      ["DELETE", `${env.API_URL}/comments/comment-1/reaction`],
    ])("%s %s returns 204 when authenticated", async (method, url) => {
      const res = await fetch(url, {
        method,
        headers: JSON_AUTH,
        body: method === "PUT" ? JSON.stringify({ type: "like" }) : undefined,
      });
      expect(res.status).toBe(204);
    });

    it("returns 401 without Authorization", async () => {
      const res = await fetch(`${env.API_URL}/videos/video-1/reaction`, {
        method: "PUT",
      });
      expect(res.status).toBe(401);
    });

    it("returns 404 VIDEO_NOT_FOUND for the video trigger", async () => {
      const res = await fetch(`${env.API_URL}/videos/video-not-found-id/reaction`, {
        method: "PUT",
        headers: AUTH,
      });
      expect(res.status).toBe(404);
      expect(((await res.json()) as ApiErrorEnvelope).error).toBe("VIDEO_NOT_FOUND");
    });

    it("returns 404 COMMENT_NOT_FOUND for the comment-not-found-id trigger", async () => {
      const res = await fetch(
        `${env.API_URL}/comments/comment-not-found-id/reaction`,
        { method: "DELETE", headers: AUTH }
      );
      expect(res.status).toBe(404);
      expect(((await res.json()) as ApiErrorEnvelope).error).toBe(
        "COMMENT_NOT_FOUND"
      );
    });
  });

  describe("subscription", () => {
    it("PUT and DELETE return 204", async () => {
      const url = `${env.API_URL}/channels/fixture-channel/subscription`;
      expect((await fetch(url, { method: "PUT", headers: AUTH })).status).toBe(204);
      expect((await fetch(url, { method: "DELETE", headers: AUTH })).status).toBe(204);
    });

    it("PUT returns 403 CANNOT_SUBSCRIBE_OWN_CHANNEL for the own-channel nickname", async () => {
      const res = await fetch(`${env.API_URL}/channels/own-channel/subscription`, {
        method: "PUT",
        headers: AUTH,
      });
      expect(res.status).toBe(403);
      expect(((await res.json()) as ApiErrorEnvelope).error).toBe(
        "CANNOT_SUBSCRIBE_OWN_CHANNEL"
      );
    });

    it("PUT returns 404 CHANNEL_NOT_FOUND for the nickname-not-found trigger", async () => {
      const res = await fetch(
        `${env.API_URL}/channels/nickname-not-found/subscription`,
        { method: "PUT", headers: AUTH }
      );
      expect(res.status).toBe(404);
    });
  });

  describe("comments", () => {
    it("GET /videos/:id/comments returns { items, nextCursor, totalCount }", async () => {
      const res = await fetch(`${env.API_URL}/videos/video-1/comments`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as CommentList;
      expect(body.items?.length).toBeGreaterThan(0);
      expect(body.nextCursor).toBe("page-2");
      expect(body.totalCount).toBe(4);
      expect(body.items?.[0].viewerState).toBeNull();
    });

    it("GET /videos/:id/comments follows the cursor to the last page and exposes viewerState when authenticated", async () => {
      const res = await fetch(
        `${env.API_URL}/videos/video-1/comments?cursor=page-2`,
        { headers: AUTH }
      );
      const body = (await res.json()) as CommentList;
      expect(body.nextCursor).toBeNull();
      expect(body.items?.[0].viewerState).toEqual({ reaction: null });
    });

    it("POST /videos/:id/comments returns 201 with the created comment", async () => {
      const res = await fetch(`${env.API_URL}/videos/video-1/comments`, {
        method: "POST",
        headers: JSON_AUTH,
        body: JSON.stringify({ body: "Hello", parentId: "comment-1" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as CommentItem;
      expect(body).toMatchObject({ body: "Hello", parentId: "comment-1" });
    });

    it("POST returns 404 COMMENT_NOT_FOUND for the comment-not-found-id parent trigger", async () => {
      const res = await fetch(`${env.API_URL}/videos/video-1/comments`, {
        method: "POST",
        headers: JSON_AUTH,
        body: JSON.stringify({ body: "Hello", parentId: "comment-not-found-id" }),
      });
      expect(res.status).toBe(404);
      expect(((await res.json()) as ApiErrorEnvelope).error).toBe(
        "COMMENT_NOT_FOUND"
      );
    });

    it("POST returns 400 COMMENT_DEPTH_EXCEEDED for the depth trigger", async () => {
      const res = await fetch(`${env.API_URL}/videos/video-1/comments`, {
        method: "POST",
        headers: JSON_AUTH,
        body: JSON.stringify({
          body: "Hello",
          parentId: "comment-depth-exceeded-id",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("POST returns 401 without Authorization", async () => {
      const res = await fetch(`${env.API_URL}/videos/video-1/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "Hello" }),
      });
      expect(res.status).toBe(401);
    });

    it("GET /comments/:id/replies returns { items, nextCursor }", async () => {
      const res = await fetch(`${env.API_URL}/comments/comment-1/replies`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as CommentReplies;
      expect(body.items?.length).toBe(2);
      expect(body.items?.[0].parentId).toBe("comment-1");
      expect(body.nextCursor).toBeNull();
    });

    it("GET /comments/:id/replies returns 404 COMMENT_NOT_FOUND for the trigger", async () => {
      const res = await fetch(
        `${env.API_URL}/comments/comment-not-found-id/replies`
      );
      expect(res.status).toBe(404);
      expect(((await res.json()) as ApiErrorEnvelope).error).toBe(
        "COMMENT_NOT_FOUND"
      );
    });
  });

  describe("subscriptions lists", () => {
    it("GET /subscriptions returns the followed channels", async () => {
      const res = await fetch(`${env.API_URL}/subscriptions`, { headers: AUTH });
      expect(res.status).toBe(200);
      const body = (await res.json()) as SubscriptionList;
      expect(body.items?.length).toBe(2);
    });

    it("GET /subscriptions/videos returns a paginated feed", async () => {
      const res = await fetch(`${env.API_URL}/subscriptions/videos?page=2`, {
        headers: AUTH,
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as SubscriptionFeed;
      expect(body.page).toBe(2);
      expect(body.items?.[0].channelNickname).toBe("fixture-channel");
    });

    it("both return 401 without Authorization", async () => {
      expect((await fetch(`${env.API_URL}/subscriptions`)).status).toBe(401);
      expect((await fetch(`${env.API_URL}/subscriptions/videos`)).status).toBe(401);
    });
  });

  describe("viewerState on channel and video reads", () => {
    it("GET /channels/:nickname exposes subscriberCount and viewerState null for anonymous", async () => {
      const res = await fetch(`${env.API_URL}/channels/fixture-channel`);
      const body = (await res.json()) as {
        subscriberCount: number;
        viewerState: unknown;
      };
      expect(body.subscriberCount).toBe(1200);
      expect(body.viewerState).toBeNull();
    });

    it("GET /channels/own-channel flags isChannelOwner for an authenticated reader", async () => {
      const res = await fetch(`${env.API_URL}/channels/own-channel`, {
        headers: AUTH,
      });
      const body = (await res.json()) as {
        viewerState: { isChannelOwner: boolean };
      };
      expect(body.viewerState.isChannelOwner).toBe(true);
    });

    it("GET /videos/own-channel-video-id flags isChannelOwner for an authenticated reader", async () => {
      const res = await fetch(`${env.API_URL}/videos/own-channel-video-id`, {
        headers: AUTH,
      });
      const body = (await res.json()) as {
        likeCount: number;
        viewerState: { isChannelOwner: boolean };
      };
      expect(body.likeCount).toBe(42);
      expect(body.viewerState.isChannelOwner).toBe(true);
    });
  });
});
