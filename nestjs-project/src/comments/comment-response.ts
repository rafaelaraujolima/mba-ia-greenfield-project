import type { CommentItem } from './comments.service';

export interface CommentResponse {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: { channelName: string; channelNickname: string };
  likeCount: number;
  replyCount: number;
  viewerState: { reaction: 'like' | 'dislike' | null } | null;
}

export interface RepliesResponse {
  items: CommentResponse[];
  nextCursor: string | null;
}

export interface TopLevelCommentsResponse extends RepliesResponse {
  totalCount: number;
}

export function toCommentResponse(item: CommentItem): CommentResponse {
  return {
    id: item.id,
    parentId: item.parentId,
    body: item.body,
    createdAt: item.createdAt.toISOString(),
    author: item.author,
    likeCount: item.likeCount,
    replyCount: item.replyCount,
    viewerState: item.viewerState,
  };
}
