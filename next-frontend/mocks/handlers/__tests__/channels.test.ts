import { describe, expect, it } from "vitest";

import type { ApiErrorEnvelope } from "@/lib/api/contracts";
import { env } from "@/lib/env";

const CHANNEL_NOT_OWNED_ID = "channel-not-owned-id";
const CHANNEL_NOT_FOUND_ID = "channel-not-found-id";
const NICKNAME_NOT_FOUND = "nickname-not-found";
const ALREADY_USED_NICKNAME = "already-used-nickname";

describe("MSW handlers — channels", () => {
  describe("GET /channels/me", () => {
    it("returns the fixture channel when authenticated", async () => {
      const res = await fetch(`${env.API_URL}/channels/me`, {
        headers: { Authorization: "Bearer fixture-access-token" },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ id: "channel-fixture-id", nickname: "fixture-channel" });
    });

    it("returns 401 when no Authorization header is present", async () => {
      const res = await fetch(`${env.API_URL}/channels/me`);
      expect(res.status).toBe(401);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("UNAUTHORIZED");
    });

    it("returns 404 CHANNEL_NOT_FOUND when the user has no channel", async () => {
      const res = await fetch(`${env.API_URL}/channels/me`, {
        headers: { Authorization: "Bearer no-channel-token" },
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("CHANNEL_NOT_FOUND");
    });
  });

  describe("GET /channels/:nickname", () => {
    it("returns the public channel info on success", async () => {
      const res = await fetch(`${env.API_URL}/channels/fixture-channel`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ nickname: "fixture-channel" });
    });

    it("returns 404 CHANNEL_NOT_FOUND", async () => {
      const res = await fetch(`${env.API_URL}/channels/${NICKNAME_NOT_FOUND}`);
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("CHANNEL_NOT_FOUND");
    });
  });

  describe("GET /channels/:nickname/videos", () => {
    it("returns a paginated list on success", async () => {
      const res = await fetch(`${env.API_URL}/channels/fixture-channel/videos?page=2`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.page).toBe(2);
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThan(0);
      expect(typeof body.pageSize).toBe("number");
      expect(typeof body.total).toBe("number");
    });

    it("returns 404 CHANNEL_NOT_FOUND", async () => {
      const res = await fetch(`${env.API_URL}/channels/${NICKNAME_NOT_FOUND}/videos`);
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("CHANNEL_NOT_FOUND");
    });
  });

  describe("GET /channels/:id/manage/videos", () => {
    it("returns { items, page, pageSize, total } for page=2", async () => {
      const res = await fetch(`${env.API_URL}/channels/channel-fixture-id/manage/videos?page=2`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ page: 2 });
      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.pageSize).toBe("number");
      expect(typeof body.total).toBe("number");
    });

    it("defaults to page=1 when no page query param is given", async () => {
      const res = await fetch(`${env.API_URL}/channels/channel-fixture-id/manage/videos`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.page).toBe(1);
    });

    it("returns 403 CHANNEL_NOT_OWNED", async () => {
      const res = await fetch(`${env.API_URL}/channels/${CHANNEL_NOT_OWNED_ID}/manage/videos`);
      expect(res.status).toBe(403);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("CHANNEL_NOT_OWNED");
    });

    it("returns 404 CHANNEL_NOT_FOUND", async () => {
      const res = await fetch(`${env.API_URL}/channels/${CHANNEL_NOT_FOUND_ID}/manage/videos`);
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("CHANNEL_NOT_FOUND");
    });
  });

  describe("PATCH /channels/:id", () => {
    function patchRequest(id: string, body: Record<string, unknown>) {
      return fetch(`${env.API_URL}/channels/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("returns the updated channel on success", async () => {
      const res = await patchRequest("channel-fixture-id", { name: "New Name" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ id: "channel-fixture-id" });
      expect(body.updatedAt).toBeTruthy();
    });

    it("returns 409 NICKNAME_ALREADY_EXISTS", async () => {
      const res = await patchRequest("channel-fixture-id", { nickname: ALREADY_USED_NICKNAME });
      expect(res.status).toBe(409);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("NICKNAME_ALREADY_EXISTS");
    });

    it("returns 403 CHANNEL_NOT_OWNED", async () => {
      const res = await patchRequest(CHANNEL_NOT_OWNED_ID, {});
      expect(res.status).toBe(403);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("CHANNEL_NOT_OWNED");
    });

    it("returns 404 CHANNEL_NOT_FOUND", async () => {
      const res = await patchRequest(CHANNEL_NOT_FOUND_ID, {});
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("CHANNEL_NOT_FOUND");
    });
  });

  describe("GET /categories", () => {
    it("returns the categories list", async () => {
      const res = await fetch(`${env.API_URL}/categories`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty("id");
      expect(body[0]).toHaveProperty("name");
    });
  });
});
