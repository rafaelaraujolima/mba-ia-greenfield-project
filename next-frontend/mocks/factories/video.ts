import type { ChannelVideoList, ManageVideoList, Video } from "@/lib/api/contracts";

type ManageVideoListItem = NonNullable<ManageVideoList["items"]>[number];
type ChannelVideoListItem = NonNullable<ChannelVideoList["items"]>[number];

const baseVideo: Video = {
  id: "video-fixture-id",
  title: "Fixture Video Title",
  description: "A fixture video description.",
  categoryId: "category-fixture-id",
  visibility: "public",
  status: "ready",
  durationSeconds: 630,
  width: 1920,
  height: 1080,
  publishedAt: "2026-01-01T00:00:00.000Z",
  thumbnailKey: "thumbnails/video-fixture-id.jpg",
  createdAt: "2025-12-31T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

export const buildVideo = (overrides: Partial<Video> = {}): Video => ({
  ...baseVideo,
  ...overrides,
});

const baseManageVideoListItem: ManageVideoListItem = {
  id: "video-fixture-id",
  title: "Fixture Video Title",
  thumbnailKey: "thumbnails/video-fixture-id.jpg",
  status: "ready",
  visibility: "public",
  publishedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  views: 0,
  likes: 0,
  comments: 0,
};

export const buildManageVideoListItem = (
  overrides: Partial<ManageVideoListItem> = {}
): ManageVideoListItem => ({
  ...baseManageVideoListItem,
  ...overrides,
});

const baseChannelVideoListItem: ChannelVideoListItem = {
  id: "video-fixture-id",
  title: "Fixture Video Title",
  thumbnailKey: "thumbnails/video-fixture-id.jpg",
  publishedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  durationSeconds: 630,
};

export const buildChannelVideoListItem = (
  overrides: Partial<ChannelVideoListItem> = {}
): ChannelVideoListItem => ({
  ...baseChannelVideoListItem,
  ...overrides,
});
