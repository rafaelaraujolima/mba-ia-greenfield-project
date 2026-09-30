import { describe, expect, it } from "vitest";

import type { ApiErrorEnvelope } from "@/lib/api/contracts";
import { env } from "@/lib/env";

const VIDEO_NOT_FOUND_ID = "video-not-found-id";
const VIDEO_NOT_OWNED_ID = "video-not-owned-id";
const VIDEO_INVALID_STATE_ID = "video-invalid-state-id";
const CATEGORY_NOT_FOUND_ID = "category-not-found-id";

describe("MSW handlers — videos", () => {
  describe("GET /videos/:id", () => {
    it("returns the fixture video on success", async () => {
      const res = await fetch(`${env.API_URL}/videos/video-fixture-id`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ id: "video-fixture-id", status: "ready" });
    });

    it("returns 404 VIDEO_NOT_FOUND", async () => {
      const res = await fetch(`${env.API_URL}/videos/${VIDEO_NOT_FOUND_ID}`);
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("VIDEO_NOT_FOUND");
    });
  });

  describe("PATCH /videos/:id", () => {
    function patchRequest(id: string, body: Record<string, unknown>) {
      return fetch(`${env.API_URL}/videos/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("returns the updated video on success", async () => {
      const res = await patchRequest("video-fixture-id", { title: "New title" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ id: "video-fixture-id" });
    });

    it("returns 404 VIDEO_NOT_FOUND", async () => {
      const res = await patchRequest(VIDEO_NOT_FOUND_ID, {});
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("VIDEO_NOT_FOUND");
    });

    it("returns 403 VIDEO_NOT_OWNED", async () => {
      const res = await patchRequest(VIDEO_NOT_OWNED_ID, {});
      expect(res.status).toBe(403);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("VIDEO_NOT_OWNED");
    });

    it("returns 404 CATEGORY_NOT_FOUND", async () => {
      const res = await patchRequest("video-fixture-id", {
        categoryId: CATEGORY_NOT_FOUND_ID,
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("CATEGORY_NOT_FOUND");
    });
  });

  describe("POST /videos/:id/thumbnail", () => {
    function uploadThumbnail(id: string, file: File) {
      const formData = new FormData();
      formData.set("thumbnail", file);
      return fetch(`${env.API_URL}/videos/${id}/thumbnail`, {
        method: "POST",
        body: formData,
      });
    }

    it("returns the updated thumbnail key on success", async () => {
      const file = new File(["fake-image-bytes"], "thumb.png", { type: "image/png" });
      const res = await uploadThumbnail("video-fixture-id", file);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ id: "video-fixture-id" });
    });

    it("returns 404 VIDEO_NOT_FOUND", async () => {
      const file = new File(["fake-image-bytes"], "thumb.png", { type: "image/png" });
      const res = await uploadThumbnail(VIDEO_NOT_FOUND_ID, file);
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("VIDEO_NOT_FOUND");
    });

    it("returns 403 VIDEO_NOT_OWNED", async () => {
      const file = new File(["fake-image-bytes"], "thumb.png", { type: "image/png" });
      const res = await uploadThumbnail(VIDEO_NOT_OWNED_ID, file);
      expect(res.status).toBe(403);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("VIDEO_NOT_OWNED");
    });

    it("returns 400 INVALID_FILE_TYPE for a non-image file", async () => {
      const file = new File(["not an image"], "doc.pdf", { type: "application/pdf" });
      const res = await uploadThumbnail("video-fixture-id", file);
      expect(res.status).toBe(400);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("INVALID_FILE_TYPE");
    });

    it("returns 400 THUMBNAIL_SIZE_EXCEEDED for an oversized file", async () => {
      const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
      const file = new File([oversized], "big.png", { type: "image/png" });
      const res = await uploadThumbnail("video-fixture-id", file);
      expect(res.status).toBe(400);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("THUMBNAIL_SIZE_EXCEEDED");
    });
  });

  describe("POST /videos/:id/publish", () => {
    function publishRequest(id: string) {
      return fetch(`${env.API_URL}/videos/${id}/publish`, { method: "POST" });
    }

    it("returns publishedAt on success", async () => {
      const res = await publishRequest("video-fixture-id");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ id: "video-fixture-id" });
      expect(body.publishedAt).toBeTruthy();
    });

    it("returns 404 VIDEO_NOT_FOUND", async () => {
      const res = await publishRequest(VIDEO_NOT_FOUND_ID);
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("VIDEO_NOT_FOUND");
    });

    it("returns 403 VIDEO_NOT_OWNED", async () => {
      const res = await publishRequest(VIDEO_NOT_OWNED_ID);
      expect(res.status).toBe(403);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("VIDEO_NOT_OWNED");
    });

    it("returns 409 INVALID_VIDEO_STATE", async () => {
      const res = await publishRequest(VIDEO_INVALID_STATE_ID);
      expect(res.status).toBe(409);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("INVALID_VIDEO_STATE");
    });
  });

  describe("GET /videos/:id/thumbnail", () => {
    it("redirects (302) with a Location header on success", async () => {
      const res = await fetch(`${env.API_URL}/videos/video-fixture-id/thumbnail`, {
        redirect: "manual",
      });
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toContain("video-fixture-id");
    });

    it("returns 404 VIDEO_NOT_FOUND", async () => {
      const res = await fetch(`${env.API_URL}/videos/${VIDEO_NOT_FOUND_ID}/thumbnail`, {
        redirect: "manual",
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiErrorEnvelope;
      expect(body.error).toBe("VIDEO_NOT_FOUND");
    });
  });
});
