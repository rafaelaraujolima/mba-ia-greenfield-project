import { http, HttpResponse } from "msw";

import type {
  ApiErrorEnvelope,
  PublishVideoResponse,
  UpdateVideoResponse,
  UploadThumbnailResponse,
  Video,
  VideoSuggestions,
} from "@/lib/api/contracts";
import { env } from "@/lib/env";

import { buildVideo, buildVideoSuggestionItem } from "../factories/video";

// Reserved trigger table (shared with E2E — trigger values must not collide
// with other domains' fixture values, e.g. mocks/handlers/auth.ts's emails).
const VIDEO_NOT_FOUND_ID = "video-not-found-id";
const VIDEO_NOT_OWNED_ID = "video-not-owned-id";
const VIDEO_INVALID_STATE_ID = "video-invalid-state-id";
const CATEGORY_NOT_FOUND_ID = "category-not-found-id";

const THUMBNAIL_SIZE_LIMIT_BYTES = 5 * 1024 * 1024; // 5MB, per Error Catalog

function errorEnvelope(
  statusCode: number,
  error: string,
  message: string
): ApiErrorEnvelope {
  return { statusCode, error, message, code: null };
}

export const handlers = [
  // GET /videos/:id
  http.get(`${env.API_URL}/videos/:id`, ({ params }) => {
    const id = params.id as string;

    if (id === VIDEO_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "VIDEO_NOT_FOUND", "Video not found"),
        { status: 404 }
      );
    }
    return HttpResponse.json<Video>(buildVideo({ id }), { status: 200 });
  }),

  // PATCH /videos/:id
  http.patch(`${env.API_URL}/videos/:id`, async ({ request, params }) => {
    const id = params.id as string;

    if (id === VIDEO_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "VIDEO_NOT_FOUND", "Video not found"),
        { status: 404 }
      );
    }
    if (id === VIDEO_NOT_OWNED_ID) {
      return HttpResponse.json(
        errorEnvelope(403, "VIDEO_NOT_OWNED", "Video does not belong to requester"),
        { status: 403 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (body.categoryId === CATEGORY_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "CATEGORY_NOT_FOUND", "Category not found"),
        { status: 404 }
      );
    }

    const video = buildVideo({ id });
    return HttpResponse.json<UpdateVideoResponse>(
      {
        id: video.id,
        title: video.title,
        description: video.description,
        categoryId: video.categoryId,
        visibility: video.visibility,
        status: video.status,
        publishedAt: video.publishedAt,
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
      { status: 200 }
    );
  }),

  // POST /videos/:id/thumbnail
  http.post(`${env.API_URL}/videos/:id/thumbnail`, async ({ request, params }) => {
    const id = params.id as string;

    if (id === VIDEO_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "VIDEO_NOT_FOUND", "Video not found"),
        { status: 404 }
      );
    }
    if (id === VIDEO_NOT_OWNED_ID) {
      return HttpResponse.json(
        errorEnvelope(403, "VIDEO_NOT_OWNED", "Video does not belong to requester"),
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("thumbnail");

    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return HttpResponse.json(
        errorEnvelope(400, "INVALID_FILE_TYPE", "File is not an image"),
        { status: 400 }
      );
    }
    if (file.size > THUMBNAIL_SIZE_LIMIT_BYTES) {
      return HttpResponse.json(
        errorEnvelope(400, "THUMBNAIL_SIZE_EXCEEDED", "Thumbnail exceeds the size limit"),
        { status: 400 }
      );
    }

    return HttpResponse.json<UploadThumbnailResponse>(
      { id, thumbnailKey: `thumbnails/${id}.jpg`, updatedAt: "2026-01-03T00:00:00.000Z" },
      { status: 200 }
    );
  }),

  // POST /videos/:id/publish
  http.post(`${env.API_URL}/videos/:id/publish`, ({ params }) => {
    const id = params.id as string;

    if (id === VIDEO_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "VIDEO_NOT_FOUND", "Video not found"),
        { status: 404 }
      );
    }
    if (id === VIDEO_NOT_OWNED_ID) {
      return HttpResponse.json(
        errorEnvelope(403, "VIDEO_NOT_OWNED", "Video does not belong to requester"),
        { status: 403 }
      );
    }
    if (id === VIDEO_INVALID_STATE_ID) {
      return HttpResponse.json(
        errorEnvelope(409, "INVALID_VIDEO_STATE", "Video is not ready or is already published"),
        { status: 409 }
      );
    }

    return HttpResponse.json<PublishVideoResponse>(
      { id, publishedAt: "2026-01-03T00:00:00.000Z" },
      { status: 200 }
    );
  }),

  // GET /videos/:id/thumbnail — 302 redirect to a pre-signed URL
  http.get(`${env.API_URL}/videos/:id/thumbnail`, ({ params }) => {
    const id = params.id as string;

    if (id === VIDEO_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "VIDEO_NOT_FOUND", "Video not found"),
        { status: 404 }
      );
    }

    return new HttpResponse(null, {
      status: 302,
      headers: {
        Location: `https://fixture-storage.example.com/thumbnails/${id}.jpg`,
        "Cache-Control": "private, max-age=60",
      },
    });
  }),

  // POST /videos/:id/views
  http.post(`${env.API_URL}/videos/:id/views`, ({ params }) => {
    const id = params.id as string;

    if (id === VIDEO_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "VIDEO_NOT_FOUND", "Video not found"),
        { status: 404 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // GET /videos/:id/suggestions
  http.get(`${env.API_URL}/videos/:id/suggestions`, ({ params }) => {
    const id = params.id as string;

    if (id === VIDEO_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "VIDEO_NOT_FOUND", "Video not found"),
        { status: 404 }
      );
    }

    return HttpResponse.json<VideoSuggestions>(
      { items: [buildVideoSuggestionItem()] },
      { status: 200 }
    );
  }),

  // GET /videos/:id/download — 302 redirect to a pre-signed attachment URL
  http.get(`${env.API_URL}/videos/:id/download`, ({ params }) => {
    const id = params.id as string;

    if (id === VIDEO_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "VIDEO_NOT_FOUND", "Video not found"),
        { status: 404 }
      );
    }

    return new HttpResponse(null, {
      status: 302,
      headers: {
        Location: `https://fixture-storage.example.com/videos/${id}/original.mp4?response-content-disposition=attachment`,
      },
    });
  }),
];
