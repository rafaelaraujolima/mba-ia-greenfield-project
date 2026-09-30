import { http, HttpResponse } from "msw";

import type {
  ApiErrorEnvelope,
  Category,
  Channel,
  ChannelVideoList,
  ManageVideoList,
} from "@/lib/api/contracts";
import { env } from "@/lib/env";

import { buildCategoryList } from "../factories/category";
import { buildChannel } from "../factories/channel";
import { buildChannelVideoListItem, buildManageVideoListItem } from "../factories/video";

// Reserved trigger table (shared with E2E — trigger values must not collide
// with other domains' fixture values).
const CHANNEL_NOT_OWNED_ID = "channel-not-owned-id";
const CHANNEL_NOT_FOUND_ID = "channel-not-found-id";
const NICKNAME_NOT_FOUND = "nickname-not-found";
const ALREADY_USED_NICKNAME = "already-used-nickname";
const NO_CHANNEL_TOKEN = "no-channel-token";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_TOTAL = 25;

function errorEnvelope(
  statusCode: number,
  error: string,
  message: string
): ApiErrorEnvelope {
  return { statusCode, error, message, code: null };
}

export const handlers = [
  // GET /channels/me
  http.get(`${env.API_URL}/channels/me`, ({ request }) => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return HttpResponse.json(
        errorEnvelope(401, "UNAUTHORIZED", "Missing or invalid access token"),
        { status: 401 }
      );
    }
    if (authHeader === `Bearer ${NO_CHANNEL_TOKEN}`) {
      return HttpResponse.json(
        errorEnvelope(404, "CHANNEL_NOT_FOUND", "Requester has no channel"),
        { status: 404 }
      );
    }

    return HttpResponse.json<Channel>(buildChannel(), { status: 200 });
  }),

  // GET /channels/:nickname
  http.get(`${env.API_URL}/channels/:nickname`, ({ params }) => {
    const nickname = params.nickname as string;

    if (nickname === NICKNAME_NOT_FOUND) {
      return HttpResponse.json(
        errorEnvelope(404, "CHANNEL_NOT_FOUND", "Channel not found"),
        { status: 404 }
      );
    }

    const channel = buildChannel({ nickname });
    return HttpResponse.json<Omit<Channel, "updatedAt">>(
      {
        id: channel.id,
        name: channel.name,
        nickname: channel.nickname,
        description: channel.description,
      },
      { status: 200 }
    );
  }),

  // GET /channels/:nickname/videos — public listing (ready, public, published only)
  http.get(`${env.API_URL}/channels/:nickname/videos`, ({ params, request }) => {
    const nickname = params.nickname as string;

    if (nickname === NICKNAME_NOT_FOUND) {
      return HttpResponse.json(
        errorEnvelope(404, "CHANNEL_NOT_FOUND", "Channel not found"),
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const items = Array.from({ length: DEFAULT_PAGE_SIZE }, (_, i) =>
      buildChannelVideoListItem({
        id: `video-${nickname}-${page}-${i + 1}`,
        title: `Fixture Video ${page}-${i + 1}`,
      })
    );

    return HttpResponse.json<ChannelVideoList>(
      { items, page, pageSize: DEFAULT_PAGE_SIZE, total: DEFAULT_TOTAL },
      { status: 200 }
    );
  }),

  // GET /channels/:id/manage/videos — owner-only management panel listing
  http.get(`${env.API_URL}/channels/:id/manage/videos`, ({ params, request }) => {
    const id = params.id as string;

    if (id === CHANNEL_NOT_OWNED_ID) {
      return HttpResponse.json(
        errorEnvelope(403, "CHANNEL_NOT_OWNED", "Channel does not belong to requester"),
        { status: 403 }
      );
    }
    if (id === CHANNEL_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "CHANNEL_NOT_FOUND", "Channel not found"),
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const items = Array.from({ length: DEFAULT_PAGE_SIZE }, (_, i) =>
      buildManageVideoListItem({
        id: `video-${id}-${page}-${i + 1}`,
        title: `Fixture Video ${page}-${i + 1}`,
      })
    );

    return HttpResponse.json<ManageVideoList>(
      { items, page, pageSize: DEFAULT_PAGE_SIZE, total: DEFAULT_TOTAL },
      { status: 200 }
    );
  }),

  // PATCH /channels/:id
  http.patch(`${env.API_URL}/channels/:id`, async ({ request, params }) => {
    const id = params.id as string;

    if (id === CHANNEL_NOT_OWNED_ID) {
      return HttpResponse.json(
        errorEnvelope(403, "CHANNEL_NOT_OWNED", "Channel does not belong to requester"),
        { status: 403 }
      );
    }
    if (id === CHANNEL_NOT_FOUND_ID) {
      return HttpResponse.json(
        errorEnvelope(404, "CHANNEL_NOT_FOUND", "Channel not found"),
        { status: 404 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const nickname = typeof body.nickname === "string" ? body.nickname : undefined;
    const name = typeof body.name === "string" ? body.name : undefined;
    const description =
      typeof body.description === "string" || body.description === null
        ? body.description
        : undefined;

    if (nickname === ALREADY_USED_NICKNAME) {
      return HttpResponse.json(
        errorEnvelope(409, "NICKNAME_ALREADY_EXISTS", "Nickname is already in use"),
        { status: 409 }
      );
    }

    const channel = buildChannel({
      id,
      ...(nickname ? { nickname } : {}),
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    });
    return HttpResponse.json<Channel>(
      { ...channel, updatedAt: "2026-01-03T00:00:00.000Z" },
      { status: 200 }
    );
  }),

  // GET /categories
  http.get(`${env.API_URL}/categories`, () => {
    return HttpResponse.json<Category[]>(buildCategoryList(), { status: 200 });
  }),
];
