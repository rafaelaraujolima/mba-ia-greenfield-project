import type {
  CommentItem,
  CommentList,
  SubscriptionFeed,
  SubscriptionList,
} from "@/lib/api/contracts";

type SubscriptionItem = NonNullable<SubscriptionList["items"]>[number];
type SubscriptionFeedItem = NonNullable<SubscriptionFeed["items"]>[number];

const baseCommentItem: CommentItem = {
  id: "comment-fixture-id",
  parentId: null,
  body: "A fixture comment.",
  createdAt: "2026-01-03T00:00:00.000Z",
  author: {
    channelName: "Fixture Commenter",
    channelNickname: "fixture-commenter",
  },
  likeCount: 0,
  replyCount: 0,
  viewerState: null,
};

export const buildCommentItem = (
  overrides: Partial<CommentItem> = {}
): CommentItem => ({
  ...baseCommentItem,
  ...overrides,
});

export const buildCommentList = (
  overrides: Partial<CommentList> = {}
): CommentList => ({
  items: [buildCommentItem()],
  nextCursor: null,
  totalCount: 1,
  ...overrides,
});

const baseSubscriptionItem: SubscriptionItem = {
  channelId: "channel-fixture-id",
  channelName: "Fixture Channel",
  channelNickname: "fixture-channel",
  subscribedAt: "2026-01-04T00:00:00.000Z",
};

export const buildSubscriptionItem = (
  overrides: Partial<SubscriptionItem> = {}
): SubscriptionItem => ({
  ...baseSubscriptionItem,
  ...overrides,
});

const baseSubscriptionFeedItem: SubscriptionFeedItem = {
  id: "video-fixture-id",
  title: "Fixture Video Title",
  thumbnailKey: "thumbnails/video-fixture-id.jpg",
  publishedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  durationSeconds: 630,
  channelName: "Fixture Channel",
  channelNickname: "fixture-channel",
};

export const buildSubscriptionFeedItem = (
  overrides: Partial<SubscriptionFeedItem> = {}
): SubscriptionFeedItem => ({
  ...baseSubscriptionFeedItem,
  ...overrides,
});

export const buildSubscriptionFeed = (
  overrides: Partial<SubscriptionFeed> = {}
): SubscriptionFeed => ({
  items: [buildSubscriptionFeedItem()],
  page: 1,
  pageSize: 10,
  total: 1,
  ...overrides,
});
